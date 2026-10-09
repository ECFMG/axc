import { buildApplicationServicesFactory } from '@axc/application-services';
import { createDataSourcesFactory } from '@axc/persistence';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRestApp } from '../index.ts';

const body = { courseId: 'course-001', learnerEmail: 'Learner@Example.org', justification: 'I need this course for secure development work.' };
let app: ReturnType<typeof createRestApp>;
const send = async (path: string, method = 'GET', payload?: unknown) => {
	const response = await app.request(path, { method, ...(payload === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }) });
	// biome-ignore lint/suspicious/noExplicitAny: Exercise raw HTTP JSON across several response shapes.
	return { status: response.status, data: (await response.json()) as Record<string, any> };
};
beforeEach(() => {
	app = createRestApp(buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: createDataSourcesFactory() }));
});

describe('course search', () => {
	it('lists fixture courses with pagination, filters, keyword, and sorting', async () => {
		const defaults = await send('/api/courses');
		expect(defaults.status).toBe(200);
		expect(defaults.data.page).toBe(1);
		expect(defaults.data.pageSize).toBe(10);
		expect(defaults.data.totalItems).toBe(12);
		expect(defaults.data.items).toHaveLength(10);
		expect(defaults.data.items[0]).toEqual(
			expect.objectContaining({
				id: expect.any(String),
				title: expect.any(String),
				summary: expect.any(String),
				modality: expect.any(String),
				status: expect.any(String),
				tags: expect.any(Array),
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			}),
		);
		const filtered = await send('/api/courses?q=SECURITY&modality=online&status=active&tag=ai');
		expect(filtered.data.items.map((item: { id: string }) => item.id)).toEqual(['course-001']);
		const second = await send('/api/courses?page=2&pageSize=5&sort=createdAt');
		expect(second.data.items).toHaveLength(5);
		expect(second.data.items[0].id).toBe('course-006');
		expect(second.data.totalPages).toBe(3);
		const empty = await send('/api/courses?q=nonexistent');
		expect(empty.data).toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
	});
	it.each(['modality=remote', 'status=missing', 'page=0', 'pageSize=51', 'sort=id'])('rejects invalid query %s', async (query) => {
		const response = await send(`/api/courses?${query}`);
		expect(response.status).toBe(400);
		expect(response.data.error.code).toBe('INVALID_QUERY_PARAMETER');
	});
});

describe('enrollment requests', () => {
	it('creates, retrieves, filters, and audits valid transitions', async () => {
		const created = await send('/api/enrollment-requests', 'POST', body);
		expect(created.status).toBe(201);
		expect(created.data).toMatchObject({ courseId: body.courseId, learnerEmail: 'learner@example.org', status: 'pending' });
		expect(created.data.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: created.data.createdAt, changedBy: 'system', reason: null }]);
		const id = created.data.id as string;
		const found = await send(`/api/enrollment-requests/${id}`);
		expect(found.data).toEqual(created.data);
		const filtered = await send('/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=LEARNER@example.org');
		expect(filtered.data.items.map((item: { id: string }) => item.id)).toEqual([id]);
		const approved = await send(`/api/enrollment-requests/${id}/status`, 'PATCH', { status: 'approved', changedBy: 'reviewer@example.org' });
		expect(approved.status).toBe(200);
		expect(approved.data.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'approved', changedBy: 'reviewer@example.org', reason: null });
		const cancelled = await send(`/api/enrollment-requests/${id}/status`, 'PATCH', { status: 'cancelled', changedBy: 'reviewer@example.org' });
		expect(cancelled.data.status).toBe('cancelled');
		expect(cancelled.data.statusHistory).toHaveLength(3);
		expect(cancelled.data.statusHistory[2]).toMatchObject({ fromStatus: 'approved', toStatus: 'cancelled' });
		expect((await send(`/api/enrollment-requests/${id}`)).data.statusHistory).toHaveLength(3);
	});
	it('rejects missing and inactive courses with required codes', async () => {
		for (const [courseId, status, code] of [
			['missing', 404, 'COURSE_NOT_FOUND'],
			['course-003', 409, 'COURSE_NOT_ACTIVE'],
			['course-006', 409, 'COURSE_NOT_ACTIVE'],
		] as const) {
			const response = await send('/api/enrollment-requests', 'POST', { ...body, courseId });
			expect(response.status).toBe(status);
			expect(response.data.error.code).toBe(code);
		}
	});
	it('validates email, justification, status, and rejection reason', async () => {
		for (const payload of [
			{ ...body, learnerEmail: 'bad' },
			{ ...body, justification: 'short' },
		]) {
			const response = await send('/api/enrollment-requests', 'POST', payload);
			expect(response.status).toBe(400);
			expect(response.data.error.code).toBe('INVALID_REQUEST');
		}
		const id = (await send('/api/enrollment-requests', 'POST', body)).data.id as string;
		for (const payload of [
			{ status: 'invalid', changedBy: 'reviewer' },
			{ status: 'rejected', changedBy: 'reviewer' },
		]) {
			const response = await send(`/api/enrollment-requests/${id}/status`, 'PATCH', payload);
			expect(response.status).toBe(400);
			expect(response.data.error.code).toBe('INVALID_REQUEST');
		}
		const rejected = await send(`/api/enrollment-requests/${id}/status`, 'PATCH', { status: 'rejected', changedBy: 'reviewer', reason: 'Missing prerequisite' });
		expect(rejected.data.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'rejected', reason: 'Missing prerequisite' });
	});
	it('prevents pending and approved duplicates and invalid transitions', async () => {
		const id = (await send('/api/enrollment-requests', 'POST', body)).data.id as string;
		for (const state of ['pending', 'approved']) {
			if (state === 'approved') await send(`/api/enrollment-requests/${id}/status`, 'PATCH', { status: 'approved', changedBy: 'reviewer' });
			const duplicate = await send('/api/enrollment-requests', 'POST', { ...body, learnerEmail: 'learner@example.org' });
			expect(duplicate.status).toBe(409);
			expect(duplicate.data.error.code).toBe('DUPLICATE_ACTIVE_REQUEST');
		}
		const invalid = await send(`/api/enrollment-requests/${id}/status`, 'PATCH', { status: 'rejected', changedBy: 'reviewer', reason: 'No' });
		expect(invalid.status).toBe(409);
		expect(invalid.data.error.code).toBe('INVALID_STATUS_TRANSITION');
		expect((await send(`/api/enrollment-requests/${id}`)).data.statusHistory).toHaveLength(2);
	});
	it('returns not found, validates list filters, and allows a new request after cancellation', async () => {
		const missing = await send('/api/enrollment-requests/missing');
		expect(missing.status).toBe(404);
		expect(missing.data.error.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
		const badFilter = await send('/api/enrollment-requests?status=unknown');
		expect(badFilter.status).toBe(400);
		expect(badFilter.data.error.code).toBe('INVALID_QUERY_PARAMETER');
		const id = (await send('/api/enrollment-requests', 'POST', body)).data.id as string;
		await send(`/api/enrollment-requests/${id}/status`, 'PATCH', { status: 'cancelled', changedBy: 'reviewer' });
		expect((await send('/api/enrollment-requests', 'POST', body)).status).toBe(201);
	});
	it('serializes concurrent creation and returns defensive read copies', async () => {
		const [first, second] = await Promise.all([send('/api/enrollment-requests', 'POST', body), send('/api/enrollment-requests', 'POST', body)]);
		expect([first.status, second.status].sort()).toEqual([201, 409]);
		const id = (first.status === 201 ? first : second).data.id as string;
		const fetched = await send(`/api/enrollment-requests/${id}`);
		fetched.data.statusHistory.push({ toStatus: 'approved' });
		expect((await send(`/api/enrollment-requests/${id}`)).data.statusHistory).toHaveLength(1);
	});
});
