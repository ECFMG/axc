import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApplicationServicesFactory } from '../../axc/application-services/dist/index.js';
import { createRestApp } from '../../axc/rest/dist/index.js';

const valid = { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for upcoming secure development work.' };
function setup() {
	const factory = buildApplicationServicesFactory({ environment: 'test' });
	const app = createRestApp(factory);
	const call = (path = '', method = 'GET', body) => app.request(`/api/enrollment-requests${path}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }) });
	const create = (body = valid) => call('', 'POST', body);
	const change = (id, status, extra = {}) => call(`/${id}/status`, 'PATCH', { status, changedBy: 'reviewer@example.org', ...extra });
	return { app, factory, call, create, change };
}
async function error(response, status, code) {
	assert.equal(response.status, status);
	const body = await response.json();
	assert.equal(body.error.code, code);
	assert.equal(typeof body.error.message, 'string');
	assert.ok(Array.isArray(body.error.details));
}
test('creates pending, maps required fields, retrieves history and persists across requests', async () => {
	const { create, call } = setup();
	const response = await create();
	assert.equal(response.status, 201);
	const body = await response.json();
	assert.equal(response.headers.get('location'), `/api/enrollment-requests/${body.id}`);
	assert.deepEqual(Object.keys(body).sort(), ['id', 'courseId', 'learnerEmail', 'justification', 'status', 'createdAt', 'updatedAt', 'statusHistory'].sort());
	assert.equal(body.status, 'pending');
	assert.ok(Number.isFinite(Date.parse(body.createdAt)));
	assert.equal(body.updatedAt, body.createdAt);
	assert.deepEqual(body.statusHistory, [{ fromStatus: null, toStatus: 'pending', changedAt: body.createdAt, changedBy: 'system', reason: null }]);
	assert.deepEqual(await (await call(`/${body.id}`)).json(), body);
});
for (const [courseId, status, code] of [
	['missing', 404, 'COURSE_NOT_FOUND'],
	['course-004', 409, 'COURSE_NOT_ACTIVE'],
	['course-006', 409, 'COURSE_NOT_ACTIVE'],
]) {
	test(`course validation: ${courseId}`, async () => error(await setup().create({ ...valid, courseId }), status, code));
}
for (const [field, value] of [
	['learnerEmail', 'bad'],
	['learnerEmail', 'a@@b.org'],
	['learnerEmail', 'a b@example.org'],
	['learnerEmail', 42],
	['courseId', ''],
	['justification', 'x'.repeat(19)],
	['justification', 'x'.repeat(501)],
	['justification', null],
	['justification', ' '.repeat(25)],
]) {
	test(`rejects ${field}=${String(value).slice(0, 30)}`, async () => error(await setup().create({ ...valid, [field]: value }), 400, 'INVALID_REQUEST'));
}
for (const length of [20, 500]) test(`accepts justification boundary ${length}`, async () => assert.equal((await setup().create({ ...valid, justification: 'x'.repeat(length) })).status, 201));
for (const body of [null, [], 'hello', 42, {}]) test(`rejects non-object/missing body ${JSON.stringify(body)}`, async () => error(await setup().create(body), 400, 'INVALID_REQUEST'));
test('malformed JSON is 400', async () => {
	const { app } = setup();
	await error(await app.request('/api/enrollment-requests', { method: 'POST', body: '{' }), 400, 'INVALID_REQUEST');
});
for (const status of ['pending', 'approved'])
	test(`blocks duplicate ${status}, including case/whitespace email variants`, async () => {
		const { create, change } = setup();
		const first = await (await create()).json();
		if (status === 'approved') assert.equal((await change(first.id, status)).status, 200);
		await error(await create({ ...valid, learnerEmail: ' LEARNER@EXAMPLE.ORG ' }), 409, 'DUPLICATE_ACTIVE_REQUEST');
	});
test('simultaneous duplicate submissions create exactly one request', async () => {
	const { create, call } = setup();
	const results = await Promise.all(Array.from({ length: 10 }, () => create()));
	assert.equal(results.filter((r) => r.status === 201).length, 1);
	assert.equal(results.filter((r) => r.status === 409).length, 9);
	assert.equal((await (await call()).json()).length, 1);
});
for (const final of ['rejected', 'cancelled'])
	test(`allows reapplication after ${final}`, async () => {
		const { create, change } = setup();
		const first = await (await create()).json();
		assert.equal((await change(first.id, final, { reason: 'Prerequisite missing' })).status, 200);
		assert.equal((await create()).status, 201);
	});
test('distinct course and learner pairs are allowed; all filters combine', async () => {
	const { create, change, call } = setup();
	const first = await (await create()).json();
	await change(first.id, 'approved');
	await create({ ...valid, courseId: 'course-002' });
	await create({ ...valid, learnerEmail: 'other@example.org' });
	assert.equal((await (await call()).json()).length, 3);
	for (const [query, count] of [
		['status=approved', 1],
		['courseId=course-001', 2],
		['learnerEmail=LEARNER%40example.org', 2],
		['status=pending&courseId=course-002&learnerEmail=learner%40example.org', 1],
		['courseId=unknown', 0],
	]) {
		const response = await call(`?${query}`);
		assert.equal(response.status, 200);
		assert.equal((await response.json()).length, count);
	}
});
for (const query of ['status=nope', 'status=', 'learnerEmail=bad', 'courseId=', 'status=pending&status=approved', 'unknown=x'])
	test(`invalid list filter ${query}`, async () => error(await setup().call(`?${query}`), 400, 'INVALID_REQUEST'));
for (const target of ['approved', 'rejected', 'cancelled'])
	test(`pending -> ${target} appends exact audit event`, async () => {
		const { create, change, call } = setup();
		const first = await (await create()).json();
		const response = await change(first.id, target, target === 'rejected' ? { reason: 'Prerequisite missing' } : {});
		assert.equal(response.status, 200);
		const updated = await response.json();
		assert.equal(updated.createdAt, first.createdAt);
		assert.equal(updated.status, target);
		assert.deepEqual(updated.statusHistory[0], first.statusHistory[0]);
		assert.deepEqual(updated.statusHistory[1], { fromStatus: 'pending', toStatus: target, changedAt: updated.updatedAt, changedBy: 'reviewer@example.org', reason: target === 'rejected' ? 'Prerequisite missing' : null });
		assert.ok(Date.parse(updated.updatedAt) >= Date.parse(first.updatedAt));
		assert.deepEqual(await (await call(`/${first.id}`)).json(), updated);
	});
test('approved -> cancelled appends third event', async () => {
	const { create, change } = setup();
	const first = await (await create()).json();
	await change(first.id, 'approved');
	const response = await change(first.id, 'cancelled');
	assert.equal(response.status, 200);
	const result = await response.json();
	assert.equal(result.statusHistory.length, 3);
	assert.equal(result.statusHistory[2].fromStatus, 'approved');
});
for (const from of ['pending', 'approved', 'rejected', 'cancelled'])
	for (const to of ['pending', 'approved', 'rejected', 'cancelled']) {
		if ((from === 'pending' && to !== 'pending') || (from === 'approved' && to === 'cancelled')) continue;
		test(`invalid ${from} -> ${to} returns 409 and preserves history`, async () => {
			const { create, change, call } = setup();
			const first = await (await create()).json();
			if (from !== 'pending') await change(first.id, from, { reason: 'Initial decision' });
			const before = await (await call(`/${first.id}`)).json();
			await error(await change(first.id, to, { reason: 'Attempted decision' }), 409, 'INVALID_STATUS_TRANSITION');
			assert.deepEqual(await (await call(`/${first.id}`)).json(), before);
		});
	}
for (const patch of [{ status: 'rejected' }, { status: 'rejected', reason: ' ' }, { status: 'rejected', reason: 42 }, { status: 'invalid' }, { status: 'approved', changedBy: '' }, { status: 'approved', changedBy: 42 }])
	test(`invalid update ${JSON.stringify(patch)}`, async () => {
		const { create, call } = setup();
		const first = await (await create()).json();
		await error(await call(`/${first.id}/status`, 'PATCH', { changedBy: 'reviewer', ...patch }), 400, 'INVALID_REQUEST');
		assert.deepEqual(await (await call(`/${first.id}`)).json(), first);
	});
test('missing request for get and patch', async () => {
	const { call, change } = setup();
	await error(await call('/missing'), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
	await error(await change('missing', 'approved'), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
});
test('returned objects cannot mutate repository/audit state; factory instances isolated', async () => {
	const { factory } = setup();
	const a = await factory.forRequest();
	const created = a.enrollmentRequests.create(valid);
	const id = created.id;
	created.statusHistory[0].changedBy = 'tampered';
	created.status = 'cancelled';
	const b = await factory.forRequest();
	const retrieved = b.enrollmentRequests.get(id);
	assert.equal(retrieved.status, 'pending');
	assert.equal(retrieved.statusHistory[0].changedBy, 'system');
	const list = b.enrollmentRequests.list();
	list[0].statusHistory.length = 0;
	assert.equal(b.enrollmentRequests.get(id).statusHistory.length, 1);
	const other = await setup().factory.forRequest();
	assert.equal(other.enrollmentRequests.list().length, 0);
});
test('unexpected factory failure uses consistent 500 without leaking internal details', async () => {
	const app = createRestApp({
		forRequest: async () => {
			throw new Error('secret details');
		},
	});
	const response = await app.request('/api/enrollment-requests');
	await error(response, 500, 'INTERNAL_ERROR');
});
test('authorization passthrough on all enrollment routes', async () => {
	const { factory } = setup();
	const seen = [];
	const app = createRestApp({
		forRequest: (header) => {
			seen.push(header);
			return factory.forRequest(header);
		},
	});
	const request = (path, method = 'GET', body) => app.request(`/api/enrollment-requests${path}`, { method, headers: { Authorization: 'sample' }, ...(body ? { body: JSON.stringify(body) } : {}) });
	const created = await (await request('', 'POST', valid)).json();
	await request('');
	await request(`/${created.id}`);
	await request(`/${created.id}/status`, 'PATCH', { status: 'approved', changedBy: 'reviewer' });
	assert.deepEqual(seen, ['sample', 'sample', 'sample', 'sample']);
});
