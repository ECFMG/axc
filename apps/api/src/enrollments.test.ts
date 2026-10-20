import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildApplicationServicesFactory, type EnrollmentRequest } from '@axc/application-services';
import { createRestApp } from '@axc/rest';

function setup() {
	const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));
	const call = (method: string, path = '', data?: unknown) =>
		app.request(`/api/enrollment-requests${path}`, { method, ...(data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }) });
	const create = (overrides: Record<string, unknown> = {}) => call('POST', '', { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for upcoming development work.', ...overrides });
	const patch = (id: string, status: string, extra = {}) => call('PATCH', `/${id}/status`, { status, changedBy: 'reviewer@example.org', ...extra });
	return { app, call, create, patch };
}
async function error(response: Response, status: number, code: string) {
	assert.equal(response.status, status);
	const result = await response.json();
	assert.equal(result.error.code, code);
	assert.equal(typeof result.error.message, 'string');
	assert.ok(Array.isArray(result.error.details));
}

describe('enrollment request workflow', () => {
	it('creates pending requests, retrieves complete history, and maps timestamps consistently', async () => {
		const { create, call } = setup();
		const response = await create();
		assert.equal(response.status, 201);
		const request: EnrollmentRequest = await response.json();
		assert.match(request.id, /^enroll-/);
		assert.equal(request.status, 'pending');
		assert.equal(new Date(request.createdAt).toISOString(), request.createdAt);
		assert.equal(request.updatedAt, request.createdAt);
		assert.deepEqual(request.statusHistory, [{ fromStatus: null, toStatus: 'pending', changedAt: request.createdAt, changedBy: 'system', reason: null }]);
		const get = await call('GET', `/${request.id}`);
		assert.equal(get.status, 200);
		assert.deepEqual(await get.json(), request);
	});
	for (const [courseId, expected, code] of [
		['missing', 404, 'COURSE_NOT_FOUND'],
		['course-004', 409, 'COURSE_NOT_ACTIVE'],
		['course-006', 409, 'COURSE_NOT_ACTIVE'],
	] as const) {
		it(`rejects unavailable course ${courseId}`, async () => error(await setup().create({ courseId }), expected, code));
	}
	for (const overrides of [
		{ learnerEmail: 'bad' },
		{ learnerEmail: 'a@@example.org' },
		{ learnerEmail: 'a..b@example.org' },
		{ learnerEmail: 'a@-example.org' },
		{ learnerEmail: 'a@localhost' },
		{ learnerEmail: 123 },
		{ learnerEmail: '' },
		{ justification: 'short' },
		{ justification: 'x'.repeat(501) },
		{ justification: ' '.repeat(20) },
		{ justification: null },
		{ courseId: '' },
		{ courseId: 12 },
	]) {
		it(`validates input ${JSON.stringify(overrides)}`, async () => error(await setup().create(overrides), 400, 'INVALID_REQUEST'));
	}
	for (const length of [20, 500]) it(`accepts justification boundary ${length}`, async () => assert.equal((await setup().create({ justification: 'x'.repeat(length) })).status, 201));
	for (const state of ['pending', 'approved']) {
		it(`prevents duplicate ${state} requests with normalized learner email`, async () => {
			const { create, patch } = setup();
			const request = await (await create()).json();
			if (state === 'approved') assert.equal((await patch(request.id, state)).status, 200);
			await error(await create({ learnerEmail: ' LEARNER@EXAMPLE.ORG ' }), 409, 'DUPLICATE_ACTIVE_REQUEST');
			assert.equal((await create({ courseId: 'course-002' })).status, 201);
			assert.equal((await create({ learnerEmail: 'other@example.org' })).status, 201);
		});
	}
	it('prevents simultaneous duplicate creates', async () => {
		const { create } = setup();
		const results = await Promise.all(Array.from({ length: 8 }, () => create()));
		assert.deepEqual(results.map((response) => response.status).sort(), [201, 409, 409, 409, 409, 409, 409, 409]);
	});
	for (const end of ['rejected', 'cancelled'])
		it(`allows a new request after ${end}`, async () => {
			const { create, patch } = setup();
			const first = await (await create()).json();
			assert.equal((await patch(first.id, end, { reason: 'Prerequisite not completed.' })).status, 200);
			assert.equal((await create()).status, 201);
		});
	for (const [from, to] of [
		['pending', 'approved'],
		['pending', 'rejected'],
		['pending', 'cancelled'],
		['approved', 'cancelled'],
	]) {
		it(`transitions ${from} to ${to} and appends history`, async () => {
			const { create, patch, call } = setup();
			const first = await (await create()).json();
			if (from === 'approved') assert.equal((await patch(first.id, 'approved')).status, 200);
			const before = await (await call('GET', `/${first.id}`)).json();
			const response = await patch(first.id, to ?? '', { reason: 'Reviewed prerequisites.' });
			assert.equal(response.status, 200);
			const after = await response.json();
			assert.equal(after.status, to);
			assert.equal(after.createdAt, first.createdAt);
			assert.deepEqual(after.statusHistory.slice(0, -1), before.statusHistory);
			assert.deepEqual(after.statusHistory.at(-1), { fromStatus: from, toStatus: to, changedAt: after.updatedAt, changedBy: 'reviewer@example.org', reason: 'Reviewed prerequisites.' });
		});
	}
	for (const from of ['pending', 'approved', 'rejected', 'cancelled'])
		for (const to of ['pending', 'approved', 'rejected', 'cancelled']) {
			if ((from === 'pending' && to !== 'pending') || (from === 'approved' && to === 'cancelled')) continue;
			it(`rejects invalid transition ${from} to ${to} without changing history`, async () => {
				const { create, patch, call } = setup();
				const request = await (await create()).json();
				if (from !== 'pending') await patch(request.id, from, { reason: 'Reviewed prerequisites.' });
				const before = await (await call('GET', `/${request.id}`)).json();
				await error(await patch(request.id, to, { reason: 'Reviewed prerequisites.' }), 409, 'INVALID_STATUS_TRANSITION');
				assert.deepEqual(await (await call('GET', `/${request.id}`)).json(), before);
			});
		}
	for (const data of [
		{ status: 'unknown', changedBy: 'reviewer' },
		{ status: 'approved' },
		{ status: 'approved', changedBy: ' ' },
		{ status: 'rejected', changedBy: 'reviewer' },
		{ status: 'rejected', changedBy: 'reviewer', reason: '  ' },
		{ status: 'rejected', changedBy: 'reviewer', reason: 123 },
	]) {
		it(`validates status update ${JSON.stringify(data)}`, async () => {
			const { create, call } = setup();
			const request = await (await create()).json();
			await error(await call('PATCH', `/${request.id}/status`, data), 400, 'INVALID_REQUEST');
			assert.equal((await (await call('GET', `/${request.id}`)).json()).statusHistory.length, 1);
		});
	}
	it('filters independently and in combination', async () => {
		const { create, call, patch } = setup();
		const first = await (await create()).json();
		await create({ courseId: 'course-002' });
		await create({ learnerEmail: 'other@example.org' });
		await patch(first.id, 'approved');
		for (const [query, count] of [
			['', 3],
			['?status=pending', 2],
			['?courseId=course-001', 2],
			['?learnerEmail=LEARNER%40example.org', 2],
			['?status=approved&courseId=course-001&learnerEmail=learner%40example.org', 1],
			['?courseId=missing', 0],
			['?status=cancelled', 0],
		] as const) {
			const response = await call('GET', query);
			assert.equal(response.status, 200);
			assert.equal((await response.json()).length, count);
		}
	});
	for (const query of ['?status=bad', '?learnerEmail=bad', '?courseId=', '?status=pending&status=approved']) it(`rejects invalid filter ${query}`, async () => error(await setup().call('GET', query), 400, 'INVALID_REQUEST'));
	it('reports missing requests', async () => {
		const { call, patch } = setup();
		await error(await call('GET', '/missing'), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
		await error(await patch('missing', 'approved'), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
		await error(await call('PATCH', '/missing/status', { status: 'rejected', changedBy: 'reviewer' }), 400, 'INVALID_REQUEST');
	});
	for (const data of [null, [], 'string']) it(`rejects non-object body ${JSON.stringify(data)}`, async () => error(await setup().call('POST', '', data), 400, 'INVALID_REQUEST'));
	it('rejects malformed JSON', async () => {
		const { app } = setup();
		await error(await app.request('/api/enrollment-requests', { method: 'POST', body: '{bad' }), 400, 'INVALID_REQUEST');
	});
	it('isolates independent application factories and returns detached objects', async () => {
		const factory = buildApplicationServicesFactory({ environment: 'test' });
		const services = await factory.forRequest();
		const request = services.enrollmentRequests.create({ courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'x'.repeat(20) });
		request.statusHistory.length = 0;
		assert.equal((await factory.forRequest()).enrollmentRequests.get(request.id).statusHistory.length, 1);
		assert.deepEqual(await (await setup().call('GET')).json(), []);
	});
	it('returns a safe error envelope for unexpected application failures', async () => {
		const app = createRestApp({
			forRequest: () => Promise.reject(new Error('private infrastructure detail')),
		});
		const response = await app.request('/api/enrollment-requests');
		assert.equal(response.status, 500);
		assert.deepEqual(await response.json(), { error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } });
	});
});
