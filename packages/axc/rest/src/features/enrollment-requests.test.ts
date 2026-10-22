import { buildApplicationServicesFactory } from '@axc/application-services';
import { Persistence } from '@axc/persistence';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRestApp } from '../index.ts';

let app: ReturnType<typeof createRestApp>;
const input = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for upcoming engineering work.' };
const send = async (path: string, method = 'GET', value?: unknown) => {
	const response = await app.request(`/api/enrollment-requests${path}`, { method, ...(value !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) } : {}) });
	return { response, data: await response.json() };
};
const create = (overrides = {}) => send('', 'POST', { ...input, ...overrides });
const change = (id: string, status: string, extra = {}) => send(`/${id}/status`, 'PATCH', { status, changedBy: 'reviewer@example.org', ...extra });
beforeEach(() => {
	app = createRestApp(buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: Persistence() }));
});
describe('enrollment HTTP contract', () => {
	it('B-AC2 B-AC7 B-AC12 creates pending, retrieves and audits full history', async () => {
		const { response, data } = await create();
		expect(response.status).toBe(201);
		expect(response.headers.get('Location')).toBe(`/api/enrollment-requests/${data.id}`);
		expect(data).toMatchObject({
			...input,
			status: 'pending',
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: expect.any(String), changedBy: 'system', reason: null }],
		});
		expect((await send(`/${data.id}`)).data).toEqual(data);
		const approved = await change(data.id, 'approved');
		expect(approved.response.status).toBe(200);
		const cancelled = await change(data.id, 'cancelled', { reason: 'Schedule changed' });
		expect(cancelled.response.status).toBe(200);
		expect(cancelled.data.statusHistory.map((h: { toStatus: string }) => h.toStatus)).toEqual(['pending', 'approved', 'cancelled']);
		expect(cancelled.data.statusHistory[2]).toMatchObject({ fromStatus: 'approved', toStatus: 'cancelled', changedBy: 'reviewer@example.org', reason: 'Schedule changed', changedAt: cancelled.data.updatedAt });
		expect((await send(`/${data.id}`)).data).toEqual(cancelled.data);
	});
	it.each([
		['missing', 404, 'COURSE_NOT_FOUND'],
		['course-004', 409, 'COURSE_NOT_ACTIVE'],
		['course-005', 409, 'COURSE_NOT_ACTIVE'],
	])('B-AC3 B-AC4 course %s', async (courseId, status, code) => {
		const { response, data } = await create({ courseId });
		expect(response.status).toBe(status);
		expect(data.error.code).toBe(code);
		expect((await send('')).data.items).toEqual([]);
	});
	it.each([{ learnerEmail: 'invalid' }, { justification: 'too short' }, { justification: 'a'.repeat(501) }, { courseId: '' }, { learnerEmail: 3 }, { justification: null }])('B-AC5 rejects invalid body %j', async (overrides) => {
		const { response, data } = await create(overrides);
		expect(response.status).toBe(400);
		expect(data.error.code).toBe('INVALID_REQUEST');
		expect(data.error.details.length).toBeGreaterThan(0);
	});
	it('B4 B5 reports all invalid fields', async () => {
		const { data } = await create({ courseId: '', learnerEmail: 'bad', justification: '' });
		expect(data.error.details.map((d: { field: string }) => d.field)).toEqual(['courseId', 'learnerEmail', 'justification']);
	});
	it.each([20, 500])('B5 accepts length %s', async (length) => {
		expect((await create({ justification: 'a'.repeat(length) })).response.status).toBe(201);
	});
	it('B-AC6 prevents pending and approved duplicates case insensitively', async () => {
		const r = (await create()).data;
		for (const status of ['pending', 'approved']) {
			if (status === 'approved') await change(r.id, status);
			const duplicate = await create({ learnerEmail: 'LEARNER@example.org' });
			expect(duplicate.response.status).toBe(409);
			expect(duplicate.data.error.code).toBe('DUPLICATE_ACTIVE_REQUEST');
		}
		expect((await send('')).data.items).toHaveLength(1);
	});
	it('B7 concurrently submitted duplicates produce one record', async () => {
		const results = await Promise.all([create(), create()]);
		expect(results.map((r) => r.response.status).sort()).toEqual([201, 409]);
		expect((await send('')).data.items).toHaveLength(1);
	});
	it.each(['rejected', 'cancelled'])('B7 allows reapplication after %s', async (status) => {
		const r = (await create()).data;
		await change(r.id, status, { reason: 'Prerequisites missing' });
		expect((await create()).response.status).toBe(201);
	});
	it('B-AC8 supports all individual and combined filters', async () => {
		const first = (await create()).data;
		await change(first.id, 'approved');
		const second = (await create({ courseId: 'course-002' })).data;
		const third = (await create({ learnerEmail: 'other@example.org' })).data;
		for (const [query, ids] of [
			['status=approved', [first.id]],
			['courseId=course-002', [second.id]],
			['learnerEmail=LEARNER@example.org', [first.id, second.id]],
			['status=pending&courseId=course-001&learnerEmail=other@example.org', [third.id]],
			['status=rejected', []],
		] as const) {
			const result = await send(`?${query}`);
			expect(result.response.status).toBe(200);
			expect(result.data.items.map((r: { id: string }) => r.id).sort()).toEqual([...ids].sort());
		}
		expect((await send('')).data.items).toHaveLength(3);
	});
	it.each(['approved', 'rejected', 'cancelled'])('B-AC9 pending to %s', async (status) => {
		const r = (await create()).data;
		const result = await change(r.id, status, { reason: 'Business decision' });
		expect(result.response.status).toBe(200);
		expect(result.data.status).toBe(status);
		expect(result.data.statusHistory).toHaveLength(2);
	});
	it('B-AC10 conflicts leave audit history unchanged', async () => {
		const r = (await create()).data;
		const invalid = await change(r.id, 'pending');
		expect(invalid.response.status).toBe(409);
		expect(invalid.data.error.code).toBe('INVALID_STATUS_TRANSITION');
		await change(r.id, 'rejected', { reason: 'Missing prerequisite' });
		const before = (await send(`/${r.id}`)).data;
		expect((await change(r.id, 'approved')).response.status).toBe(409);
		expect((await send(`/${r.id}`)).data).toEqual(before);
	});
	it.each([undefined, '', '   ', 3])('B-AC11 rejection reason %s is invalid', async (reason) => {
		const r = (await create()).data;
		const result = await change(r.id, 'rejected', { reason });
		expect(result.response.status).toBe(400);
		expect(result.data.error.code).toBe('INVALID_REQUEST');
		expect((await send(`/${r.id}`)).data).toEqual(r);
	});
	it('B15 handles missing requests and invalid status fields', async () => {
		for (const result of [await send('/missing'), await change('missing', 'approved')]) {
			expect(result.response.status).toBe(404);
			expect(result.data.error.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
		}
		const r = (await create()).data;
		for (const [status, extra] of [
			['bad', {}],
			['approved', { changedBy: ' ' }],
		] as const) {
			const result = await change(r.id, status, extra);
			expect(result.response.status).toBe(400);
			expect(result.data.error.code).toBe('INVALID_REQUEST');
		}
	});
	it.each(['status=bad', 'status=', 'learnerEmail=bad', 'courseId=', 'unknown=x', 'status=pending&status=approved'])('B9 invalid filters %s', async (query) => {
		expect((await send(`?${query}`)).response.status).toBe(400);
	});
	it('B15 handles malformed JSON and non-object bodies', async () => {
		for (const method of ['POST', 'PATCH'])
			for (const body of ['{', 'null', '[]', '"string"']) {
				const response = await app.request(`/api/enrollment-requests${method === 'PATCH' ? '/missing/status' : ''}`, { method, headers: { 'Content-Type': 'application/json' }, body });
				expect(response.status).toBe(400);
				expect((await response.json()).error.code).toBe('INVALID_REQUEST');
			}
	});
});
