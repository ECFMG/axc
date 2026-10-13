import { buildApplicationServicesFactory } from '@axc/application-services';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

interface History {
	fromStatus: string | null;
	toStatus: string;
	changedBy: string;
	reason: string | null;
}
interface Enrollment {
	id: string;
	status: string;
	learnerEmail: string;
	courseId: string;
	statusHistory: History[];
}

let app: ReturnType<typeof createRestApp>;
beforeEach(() => {
	app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));
});

const send = async (method: string, path: string, body?: unknown) => {
	const res = await app.request(path, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
	return { status: res.status, body: (await res.json()) as Record<string, unknown> & { error?: { code: string; details: { field: string }[] } } };
};
const JUSTIFICATION = 'I need this course to prepare for secure development work.';
const create = (overrides: Record<string, unknown> = {}) => send('POST', '/api/enrollment-requests', { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: JUSTIFICATION, ...overrides });
const patch = (id: string, body: unknown) => send('PATCH', `/api/enrollment-requests/${id}/status`, body);
const created = async (overrides: Record<string, unknown> = {}) => (await create(overrides)).body as unknown as Enrollment;

describe('GET /api/courses', () => {
	it('returns a paginated page and 400 with the error contract for invalid params', async () => {
		const ok = await send('GET', '/api/courses?q=security&status=active');
		expect(ok.status).toBe(200);
		expect(ok.body).toMatchObject({ page: 1, pageSize: 10, totalItems: 3 });
		const bad = await send('GET', '/api/courses?pageSize=99');
		expect(bad.status).toBe(400);
		expect(bad.body).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }] } });
	});
});

describe('enrollment requests', () => {
	it('creates a pending request with a creation history entry (201)', async () => {
		const res = await create({ learnerEmail: 'Learner@Example.org' });
		expect(res.status).toBe(201);
		expect(res.body).toMatchObject({ id: 'enroll-001', courseId: 'course-001', learnerEmail: 'learner@example.org', justification: JUSTIFICATION, status: 'pending' });
		expect(res.body['createdAt']).toBe(res.body['updatedAt']);
		expect(res.body['statusHistory']).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: res.body['createdAt'], changedBy: 'system', reason: null }]);
	});

	it.each([
		['missing course', { courseId: 'course-999' }, 404, 'COURSE_NOT_FOUND'],
		['draft course', { courseId: 'course-004' }, 409, 'COURSE_NOT_ACTIVE'],
		['retired course', { courseId: 'course-006' }, 409, 'COURSE_NOT_ACTIVE'],
		['invalid email', { learnerEmail: 'nope' }, 400, 'INVALID_REQUEST'],
		['short justification', { justification: 'too short' }, 400, 'INVALID_REQUEST'],
		['long justification', { justification: 'x'.repeat(501) }, 400, 'INVALID_REQUEST'],
		['missing courseId', { courseId: undefined }, 400, 'INVALID_REQUEST'],
	])('rejects %s', async (_, overrides, status, code) => {
		const res = await create(overrides);
		expect(res.status).toBe(status);
		expect(res.body.error?.code).toBe(code);
	});

	it('rejects a malformed JSON body with 400', async () => {
		expect((await send('POST', '/api/enrollment-requests', '{not json')).status).toBe(400);
	});

	it('prevents duplicate pending and approved requests but allows re-request after rejection/cancellation', async () => {
		const first = await created();
		expect((await create({ learnerEmail: 'LEARNER@example.org' })).body.error?.code).toBe('DUPLICATE_ACTIVE_REQUEST');
		await patch(first.id, { status: 'approved', changedBy: 'rev' });
		const dup = await create();
		expect(dup.status).toBe(409);
		expect(dup.body.error?.code).toBe('DUPLICATE_ACTIVE_REQUEST');
		expect((await create({ courseId: 'course-003' })).status).toBe(201);
		await patch(first.id, { status: 'cancelled', changedBy: 'rev' });
		expect((await create()).status).toBe(201);
	});

	it('retrieves by id with statusHistory and 404s for unknown ids', async () => {
		const { id } = await created();
		const res = await send('GET', `/api/enrollment-requests/${id}`);
		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ id, status: 'pending', statusHistory: [{ toStatus: 'pending' }] });
		const missing = await send('GET', '/api/enrollment-requests/enroll-404');
		expect(missing.status).toBe(404);
		expect(missing.body.error?.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
	});

	it('lists with status, courseId and learnerEmail filters', async () => {
		const a = await created({ learnerEmail: 'a@example.org' });
		await created({ learnerEmail: 'b@example.org' });
		await created({ learnerEmail: 'a@example.org', courseId: 'course-003' });
		await patch(a.id, { status: 'approved', changedBy: 'rev' });
		const list = async (qs: string) => ((await send('GET', `/api/enrollment-requests${qs}`)).body['items'] as Enrollment[]).map((r) => r.id);
		expect(await list('')).toHaveLength(3);
		expect(await list('?status=approved')).toEqual([a.id]);
		expect(await list('?courseId=course-003')).toEqual(['enroll-003']);
		expect(await list('?learnerEmail=A@example.org')).toEqual([a.id, 'enroll-003']);
		expect(await list('?status=pending&courseId=course-001&learnerEmail=b@example.org')).toEqual(['enroll-002']);
		expect(await list('?status=pending&learnerEmail=nobody@example.org')).toEqual([]);
		const bad = await send('GET', '/api/enrollment-requests?status=open');
		expect(bad.status).toBe(400);
		expect(bad.body.error?.code).toBe('INVALID_REQUEST');
	});

	it.each([
		[['approved'], 'approved'],
		[['rejected'], 'rejected'],
		[['cancelled'], 'cancelled'],
		[['approved', 'cancelled'], 'cancelled'],
	])('applies valid transition path pending → %j and appends history', async (path, final) => {
		const { id } = await created();
		for (const status of path) {
			expect((await patch(id, { status, changedBy: 'reviewer@example.org', reason: 'Learner has not completed the prerequisite.' })).status).toBe(200);
		}
		const res = (await send('GET', `/api/enrollment-requests/${id}`)).body as unknown as Enrollment;
		expect(res.status).toBe(final);
		expect(res.statusHistory.map((h) => [h.fromStatus, h.toStatus])).toEqual([[null, 'pending'], ...path.map((to, i) => [i === 0 ? 'pending' : path[i - 1], to])]);
		expect(res.statusHistory.slice(1).every((h) => h.changedBy === 'reviewer@example.org')).toBe(true);
	});

	it.each([
		['pending', 'pending'],
		['rejected', 'approved'],
		['cancelled', 'approved'],
		['approved', 'rejected'],
		['approved', 'pending'],
	])('returns 409 for invalid transition %s → %s without adding history', async (from, to) => {
		const { id } = await created();
		if (from !== 'pending') await patch(id, { status: from, changedBy: 'rev', reason: 'setup reason' });
		const before = ((await send('GET', `/api/enrollment-requests/${id}`)).body as unknown as Enrollment).statusHistory.length;
		const res = await patch(id, { status: to, changedBy: 'rev', reason: 'some reason' });
		expect(res.status).toBe(409);
		expect(res.body.error?.code).toBe('INVALID_STATUS_TRANSITION');
		expect(((await send('GET', `/api/enrollment-requests/${id}`)).body as unknown as Enrollment).statusHistory).toHaveLength(before);
	});

	it.each([
		['rejection without reason', { status: 'rejected', changedBy: 'rev' }, 'reason'],
		['rejection with blank reason', { status: 'rejected', changedBy: 'rev', reason: ' ' }, 'reason'],
		['unknown status', { status: 'done', changedBy: 'rev' }, 'status'],
		['missing changedBy', { status: 'approved' }, 'changedBy'],
	])('returns 400 for %s', async (_, body, field) => {
		const { id } = await created();
		const res = await patch(id, body);
		expect(res.status).toBe(400);
		expect(res.body.error).toMatchObject({ code: 'INVALID_REQUEST', details: [{ field }] });
	});

	it('returns 404 when patching an unknown request', async () => {
		const res = await patch('enroll-404', { status: 'approved', changedBy: 'rev' });
		expect(res.status).toBe(404);
		expect(res.body.error?.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
	});
});
