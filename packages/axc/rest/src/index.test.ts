import { buildApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const app = () => createRestApp(buildApplicationServicesFactory({ environment: 'test' }));
const json = (method: string, body: unknown) => ({ method, headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
const justification = 'I need this course to prepare for secure development work.';

describe('rest app', () => {
	it('serves health and course search', async () => {
		const a = app();
		expect((await a.request('/health')).status).toBe(200);
		const res = await a.request('/api/courses?status=active&pageSize=5');
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ page: 1, pageSize: 5 });
	});

	it('maps invalid course query to 400 error envelope', async () => {
		const res = await app().request('/api/courses?pageSize=51');
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }] } });
	});

	it('runs the enrollment workflow with mapped status codes', async () => {
		const a = app();
		const created = await a.request('/api/enrollment-requests', json('POST', { courseId: 'course-001', learnerEmail: 'r@example.org', justification }));
		expect(created.status).toBe(201);
		const { id } = (await created.json()) as { id: string };
		expect((await a.request(`/api/enrollment-requests/${id}`)).status).toBe(200);
		expect((await a.request('/api/enrollment-requests?status=pending')).status).toBe(200);
		expect((await a.request('/api/enrollment-requests', json('POST', { courseId: 'course-001', learnerEmail: 'r@example.org', justification }))).status).toBe(409);
		expect((await a.request('/api/enrollment-requests', json('POST', { courseId: 'course-999', learnerEmail: 'r@example.org', justification }))).status).toBe(404);
		expect((await a.request('/api/enrollment-requests', json('POST', '{not json'))).status).toBe(400);
		expect((await a.request(`/api/enrollment-requests/${id}/status`, json('PATCH', { status: 'rejected', changedBy: 'rev' }))).status).toBe(400);
		expect((await a.request(`/api/enrollment-requests/${id}/status`, json('PATCH', { status: 'approved', changedBy: 'rev' }))).status).toBe(200);
		expect((await a.request(`/api/enrollment-requests/${id}/status`, json('PATCH', { status: 'pending', changedBy: 'rev' }))).status).toBe(409);
		expect((await a.request('/api/enrollment-requests/enroll-999')).status).toBe(404);
	});
});
