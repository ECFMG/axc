import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { Domain } from '@axc/domain';
import { expect, vi } from 'vitest';
import { createRestApp } from '../../../index.ts';
import { enrollmentSnapshot, fakeFactory, fakeServices } from '../../../test-services.ts';

const feature = await loadFeature(new URL('./features/enrollment-requests.feature', import.meta.url).pathname);
const body = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for work.' };
function jsonRequest(method: string, value: unknown): RequestInit {
	return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) };
}
describeFeature(feature, ({ Scenario }) => {
	Scenario('Successful enrollment endpoints', ({ Then }) => {
		Then('creation retrieval filtering and status updates return the documented bodies', async () => {
			const services = fakeServices();
			const api = services.Training.EnrollmentRequest;
			vi.mocked(api.create).mockResolvedValue(enrollmentSnapshot);
			vi.mocked(api.queryById).mockResolvedValue(enrollmentSnapshot);
			vi.mocked(api.queryRequests).mockResolvedValue([enrollmentSnapshot]);
			vi.mocked(api.changeStatus).mockResolvedValue({ ...enrollmentSnapshot, status: 'approved' });
			const factory = fakeFactory(services);
			const app = createRestApp(factory);
			const response = await app.request('/api/enrollment-requests', jsonRequest('POST', { ...body, learnerEmail: 'Learner@Example.org', ignored: true }));
			expect(response.status).toBe(201);
			expect(await response.json()).toEqual(enrollmentSnapshot);
			expect(api.create).toHaveBeenCalledWith(body);
			expect(await (await app.request('/api/enrollment-requests/id')).json()).toEqual(enrollmentSnapshot);
			expect(api.queryById).toHaveBeenCalledWith('id');
			for (const status of ['pending', 'approved', 'rejected', 'cancelled']) {
				expect((await app.request(`/api/enrollment-requests?status=${status}&courseId=course-001&learnerEmail=Learner%40Example.org`)).status).toBe(200);
				expect(api.queryRequests).toHaveBeenLastCalledWith({ status, courseId: 'course-001', learnerEmail: 'learner@example.org' });
			}
			expect((await app.request('/api/enrollment-requests?status= &courseId=&learnerEmail= &ignored=x')).status).toBe(200);
			expect(api.queryRequests).toHaveBeenLastCalledWith({});
			for (const status of ['approved', 'cancelled', 'pending', 'rejected']) {
				const patch = await app.request('/api/enrollment-requests/id/status', jsonRequest('PATCH', { status, changedBy: 'reviewer', reason: 'A reason' }));
				expect(patch.status).toBe(200);
				expect(api.changeStatus).toHaveBeenLastCalledWith('id', { status, changedBy: 'reviewer', reason: 'A reason' });
			}
			for (const reason of [undefined, '', '   ']) {
				const patch = await app.request('/api/enrollment-requests/id/status', jsonRequest('PATCH', { status: 'approved', changedBy: 'reviewer', ...(reason === undefined ? {} : { reason }) }));
				expect(patch.status).toBe(200);
				expect(api.changeStatus).toHaveBeenLastCalledWith('id', { status: 'approved', changedBy: 'reviewer' });
			}
			const authorized = await app.request('/api/enrollment-requests/id', { headers: { Authorization: 'sample' } });
			expect(authorized.status).toBe(200);
			expect(factory.forRequest).toHaveBeenLastCalledWith('sample');
			for (const length of [20, 500]) {
				expect((await app.request('/api/enrollment-requests', jsonRequest('POST', { ...body, justification: 'x'.repeat(length) }))).status).toBe(201);
			}
		});
	});
	Scenario('Invalid enrollment input', ({ Then }) => {
		Then('malformed bodies types field boundaries statuses and filters return 400', async () => {
			const services = fakeServices();
			const app = createRestApp(fakeFactory(services));
			const invalidBodies: unknown[] = [
				null,
				[],
				4,
				'text',
				{},
				{ ...body, courseId: '' },
				{ ...body, courseId: { $ne: '' } },
				{ ...body, learnerEmail: 'bad' },
				{ ...body, learnerEmail: 1 },
				...[0, 19, 501].map((length) => ({ ...body, justification: 'x'.repeat(length) })),
				{ ...body, justification: null },
			];
			for (const value of invalidBodies) {
				const response = await app.request('/api/enrollment-requests', jsonRequest('POST', value));
				expect(response.status, JSON.stringify(value)).toBe(400);
				expect(await response.json()).toMatchObject({ error: { code: 'INVALID_REQUEST', details: expect.any(Array) } });
			}
			for (const raw of ['{', '']) {
				expect((await app.request('/api/enrollment-requests', { method: 'POST', body: raw })).status).toBe(400);
			}
			for (const value of [
				null,
				[],
				{},
				{ status: 1, changedBy: 'reviewer' },
				{ status: 'unknown', changedBy: 'reviewer' },
				{ status: 'approved' },
				{ status: 'approved', changedBy: ' ' },
				{ status: 'rejected', changedBy: 'reviewer' },
				{ status: 'rejected', changedBy: 'reviewer', reason: ' ' },
				{ status: 'approved', changedBy: 'reviewer', reason: 4 },
			]) {
				expect((await app.request('/api/enrollment-requests/id/status', jsonRequest('PATCH', value))).status).toBe(400);
			}
			for (const query of ['status=bad', 'learnerEmail=bad']) {
				expect((await app.request(`/api/enrollment-requests?${query}`)).status).toBe(400);
			}
			expect(services.Training.EnrollmentRequest.create).not.toHaveBeenCalled();
			expect(services.Training.EnrollmentRequest.changeStatus).not.toHaveBeenCalled();
		});
	});
	Scenario('Domain errors and unexpected failures', ({ Then }) => {
		Then('errors map to safe consistent status codes and bodies', async () => {
			const services = fakeServices();
			const app = createRestApp(fakeFactory(services));
			const E = Domain.Contexts.Training.EnrollmentRequest;
			for (const [code, status] of [
				['COURSE_NOT_FOUND', 404],
				['COURSE_NOT_ACTIVE', 409],
				['DUPLICATE_ACTIVE_REQUEST', 409],
				['ENROLLMENT_REQUEST_NOT_FOUND', 404],
				['INVALID_STATUS_TRANSITION', 409],
				['INVALID_REQUEST', 400],
			] as const) {
				vi.mocked(services.Training.EnrollmentRequest.create).mockRejectedValue(new E.EnrollmentError(code));
				const response = await app.request('/api/enrollment-requests', jsonRequest('POST', body));
				expect(response.status).toBe(status);
				expect(await response.json()).toEqual({ error: { code, message: 'The request could not be completed.', details: [] } });
			}
			vi.mocked(services.Training.EnrollmentRequest.queryById).mockRejectedValue(new Error('mongodb password internal stack'));
			const response = await app.request('/api/enrollment-requests/id');
			expect(response.status).toBe(500);
			expect(await response.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } });
		});
	});
});
