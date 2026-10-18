import { buildApplicationServicesFactory } from '@axc/application-services';
import { Persistence } from '@axc/persistence';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRestApp } from '../index.ts';

let app: ReturnType<typeof createRestApp>;
beforeEach(() => {
	app = createRestApp(buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: Persistence() }));
});
const input = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for upcoming project work.' };
const send = (path: string, method = 'GET', body?: unknown) => app.request(path, { method, ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
const create = (overrides = {}) => send('/api/enrollment-requests', 'POST', { ...input, ...overrides });
const patch = (id: string, status: string, extra = {}) => send(`/api/enrollment-requests/${id}/status`, 'PATCH', { status, changedBy: 'reviewer@example.org', ...extra });
describe('Task A and B course search', () => {
	it('A-AC1 A-AC6 default pagination and full course model', async () => {
		const response = await send('/api/courses');
		expect(response.status).toBe(200);
		const b = await response.json();
		expect(b).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(b.items).toHaveLength(10);
		expect(b.items[0]).toEqual({
			id: expect.any(String),
			title: expect.any(String),
			summary: expect.any(String),
			modality: expect.any(String),
			status: expect.any(String),
			tags: expect.any(Array),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
		});
		const page = await (await send('/api/courses?page=2&pageSize=5')).json();
		expect(page.items).toHaveLength(5);
		expect(page).toMatchObject({ page: 2, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect(page.items[0].id).not.toBe(b.items[0].id);
	});
	it('A-AC2 matches title summary and tags case-insensitively', async () => {
		const b = await (await send('/api/courses?q=SeCuRiTy')).json();
		expect(b.totalItems).toBe(7);
		expect(b.items.map((c: { id: string }) => c.id)).toContain('course-002');
		expect(b.items.map((c: { id: string }) => c.id)).toContain('course-005');
		expect(b.items.map((c: { id: string }) => c.id)).toContain('course-001');
	});
	it.each([
		['modality=online', 4],
		['status=active', 10],
		['tag=AI', 6],
		['q=security&modality=online&status=active', 2],
		['tag=ai&status=active', 5],
	])('A-AC3 A-AC4 A-AC5 A-AC11 filters %s', async (query, count) => {
		const b = await (await send(`/api/courses?${query}`)).json();
		expect(b.totalItems).toBe(count);
		expect(b.items).toHaveLength(count);
	});
	it.each(['title', 'createdAt', 'updatedAt'])('A-AC7 sorts %s', async (sort) => {
		const b = await (await send(`/api/courses?sort=${sort}&pageSize=50`)).json();
		const keys = b.items.map((c: Record<string, string>) => c[sort]);
		expect(keys).toHaveLength(12);
		expect(keys).toEqual([...keys].sort((a: string, b: string) => a.localeCompare(b)));
	});
	it.each([
		'modality=remote',
		'status=pending',
		'page=0',
		'page=-1',
		'page=1.5',
		'page=1e2',
		'page=99999999999999999999',
		'pageSize=0',
		'pageSize=51',
		'sort=id',
		'tag=',
		'q=',
		'page=',
		'status=',
		'modality=',
		'page=1&page=2',
		'unknown=1',
	])('A-AC8 validates %s', async (query) => {
		const response = await send(`/api/courses?${query}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: { code: 'INVALID_QUERY_PARAMETER', details: expect.any(Array) } });
	});
	it('A-AC9 empty results', async () => {
		expect(await (await send('/api/courses?q=nomatchzz')).json()).toMatchObject({ items: [], totalItems: 0, totalPages: 0, page: 1, pageSize: 10 });
	});
});
describe('enrollment workflow', () => {
	it('B-AC2 B-AC7 B-AC12 creates retrieves and records initial audit', async () => {
		const response = await create();
		expect(response.status).toBe(201);
		const b = await response.json();
		expect(b).toMatchObject({
			...input,
			status: 'pending',
			id: expect.any(String),
			createdAt: expect.any(String),
			updatedAt: expect.any(String),
			statusHistory: [{ fromStatus: null, toStatus: 'pending', changedBy: 'system', reason: null, changedAt: expect.any(String) }],
		});
		expect(Number.isNaN(Date.parse(b.createdAt))).toBe(false);
		expect(b.updatedAt).toBe(b.createdAt);
		expect(b.statusHistory[0].changedAt).toBe(b.createdAt);
		expect(await (await send(`/api/enrollment-requests/${b.id}`)).json()).toEqual(b);
	});
	it.each([
		['missing', 404, 'COURSE_NOT_FOUND'],
		['course-011', 409, 'COURSE_NOT_ACTIVE'],
		['course-012', 409, 'COURSE_NOT_ACTIVE'],
	])('B-AC3 B-AC4 validates course %s', async (courseId, status, code) => {
		const r = await create({ courseId });
		expect(r.status).toBe(status);
		expect(await r.json()).toMatchObject({ error: { code } });
	});
	it.each([
		{ learnerEmail: 'bad' },
		{ justification: 'short' },
		{ justification: 'x'.repeat(501) },
		{ courseId: '' },
		{ learnerEmail: 12 },
		{ justification: null },
		{ learnerEmail: 'a@b@c.org' },
	])('B-AC5 validates creation %j', async (overrides) => {
		const r = await create(overrides);
		expect(r.status).toBe(400);
		expect(await r.json()).toMatchObject({ error: { code: 'INVALID_REQUEST', details: expect.any(Array) } });
		expect(await (await send('/api/enrollment-requests')).json()).toEqual({ items: [] });
	});
	it.each([20, 500])('accepts justification boundary %i', async (length) => {
		expect((await create({ justification: 'x'.repeat(length) })).status).toBe(201);
	});
	it.each(['null', '[]', '{"courseId":'])('rejects malformed body %s', async (body) => {
		const r = await app.request('/api/enrollment-requests', { method: 'POST', body, headers: { 'content-type': 'application/json' } });
		expect(r.status).toBe(400);
	});
	it('ignores client status and audit overrides on creation', async () => {
		const response = await create({ status: 'approved', statusHistory: [], changedBy: 'client' });
		expect(response.status).toBe(201);
		const body = await response.json();
		expect(body.status).toBe('pending');
		expect(body.statusHistory).toHaveLength(1);
		expect(body.statusHistory[0].changedBy).toBe('system');
	});

	it('collects all invalid fields', async () => {
		const b = await (await create({ courseId: '', learnerEmail: 'bad', justification: 'bad' })).json();
		expect(b.error.details.map((d: { field: string }) => d.field)).toEqual(expect.arrayContaining(['courseId', 'learnerEmail', 'justification']));
	});
	it('B-AC6 serializes concurrent duplicate creation and normalizes email', async () => {
		const responses = await Promise.all([create(), create({ learnerEmail: 'LEARNER@EXAMPLE.ORG' })]);
		expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
		const failed = responses.find((r) => r.status === 409);
		expect(await failed?.json()).toMatchObject({ error: { code: 'DUPLICATE_ACTIVE_REQUEST' } });
		const items = (await (await send('/api/enrollment-requests')).json()).items;
		expect(items).toHaveLength(1);
		expect((await patch(items[0].id, 'approved')).status).toBe(200);
		const duplicate = await create();
		expect(duplicate.status).toBe(409);
		expect(await duplicate.json()).toMatchObject({ error: { code: 'DUPLICATE_ACTIVE_REQUEST' } });
		expect((await create({ courseId: 'course-002' })).status).toBe(201);
		expect((await create({ learnerEmail: 'other@example.org' })).status).toBe(201);
	});
	it('B-AC8 filters individually and together', async () => {
		const first = await (await create()).json();
		await patch(first.id, 'approved');
		await create({ courseId: 'course-002' });
		await create({ learnerEmail: 'other@example.org' });
		for (const [query, count] of [
			['status=approved', 1],
			['courseId=course-001', 2],
			['learnerEmail=LEARNER%40EXAMPLE.ORG', 2],
			['status=approved&courseId=course-001&learnerEmail=learner%40example.org', 1],
			['status=rejected', 0],
		] as const) {
			const r = await send(`/api/enrollment-requests?${query}`);
			expect(r.status).toBe(200);
			expect((await r.json()).items).toHaveLength(count);
		}
	});
	it.each(['approved', 'rejected', 'cancelled'])('B-AC9 B-AC12 pending to %s with audit', async (status) => {
		const initial = await (await create()).json();
		const r = await patch(initial.id, status, { reason: 'Reviewed request' });
		expect(r.status).toBe(200);
		const b = await r.json();
		expect(b.status).toBe(status);
		expect(b.statusHistory).toHaveLength(2);
		expect(b.statusHistory[0]).toEqual(initial.statusHistory[0]);
		expect(b.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: status, changedBy: 'reviewer@example.org', reason: 'Reviewed request' });
		expect(b.updatedAt).toBe(b.statusHistory[1].changedAt);
		expect(b.createdAt).toBe(initial.createdAt);
		if (status === 'approved') {
			const cancelled = await (await patch(b.id, 'cancelled')).json();
			expect(cancelled.status).toBe('cancelled');
			expect(cancelled.statusHistory).toHaveLength(3);
			expect(cancelled.statusHistory[2]).toMatchObject({ fromStatus: 'approved', toStatus: 'cancelled' });
		} else expect((await create()).status).toBe(201);
	});
	it.each([
		['pending', 'pending'],
		['approved', 'pending'],
		['approved', 'rejected'],
		['approved', 'approved'],
		['rejected', 'approved'],
		['rejected', 'cancelled'],
		['cancelled', 'approved'],
		['cancelled', 'pending'],
	])('B-AC10 rejects %s to %s without mutation', async (start, end) => {
		let b = await (await create()).json();
		if (start !== 'pending') b = await (await patch(b.id, start, { reason: 'Reviewed' })).json();
		const r = await patch(b.id, end, { reason: 'Reviewed' });
		expect(r.status).toBe(409);
		expect(await r.json()).toMatchObject({ error: { code: 'INVALID_STATUS_TRANSITION' } });
		expect(await (await send(`/api/enrollment-requests/${b.id}`)).json()).toEqual(b);
	});
	it.each([{ status: 'rejected' }, { status: 'rejected', reason: '' }, { status: 'rejected', reason: '  ' }, { status: 'unknown' }, { changedBy: '' }, { reason: 22 }])('B-AC11 validates status body %j', async (extra) => {
		const b = await (await create()).json();
		const r = await patch(b.id, 'approved', extra);
		expect(r.status).toBe(400);
		expect(await r.json()).toMatchObject({ error: { code: 'INVALID_REQUEST' } });
		expect(await (await send(`/api/enrollment-requests/${b.id}`)).json()).toEqual(b);
	});
	it.each(['status=bad', 'status=', 'courseId=', 'learnerEmail=bad', 'learnerEmail=', 'status=pending&status=approved', 'foo=bar'])('validates list %s', async (query) => {
		expect((await send(`/api/enrollment-requests?${query}`)).status).toBe(400);
	});
	it('returns missing request errors for retrieval and update', async () => {
		for (const r of [await send('/api/enrollment-requests/missing'), await patch('missing', 'approved')]) {
			expect(r.status).toBe(404);
			expect(await r.json()).toMatchObject({ error: { code: 'ENROLLMENT_REQUEST_NOT_FOUND' } });
		}
	});
});
