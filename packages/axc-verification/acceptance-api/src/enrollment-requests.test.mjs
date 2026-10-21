import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import { buildApplicationServicesFactory } from '../../../axc/application-services/dist/index.js';
import { createRestApp } from '../../../axc/rest/dist/index.js';

const justification = 'I need this course to prepare for secure development work.';
function client() {
	const factory = buildApplicationServicesFactory({ environment: 'test' });
	const email = `learner-${randomUUID()}@example.org`;
	const send = (path = '', method = 'GET', body) => {
		const init = { method, headers: { 'Content-Type': 'application/json' } };
		if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);
		const url = `/api/enrollment-requests${path}`;
		// Recreate Hono per request, matching the Cellix Azure adapter lifetime.
		return process.env['COURSE_TEST_BASE_URL'] ? fetch(`${process.env['COURSE_TEST_BASE_URL']}${url}`, init) : createRestApp(factory).request(url, init);
	};
	const create = (overrides = {}) => send('', 'POST', { courseId: 'course-001', learnerEmail: email, justification, ...overrides });
	const change = (id, status, extra = {}) => send(`/${id}/status`, 'PATCH', { status, changedBy: 'reviewer@example.org', ...extra });
	return { send, create, change, email };
}
async function error(response, status, code, field) {
	assert.equal(response.status, status);
	const body = await response.json();
	assert.equal(body.error.code, code);
	assert.equal(typeof body.error.message, 'string');
	assert.ok(Array.isArray(body.error.details));
	if (field) assert.equal(body.error.details[0].field, field);
}

describe('enrollment request workflow', () => {
	it('creates pending requests, maps required fields, retrieves history across handler instances', async () => {
		const c = client();
		const response = await c.create({ status: 'approved', statusHistory: [] });
		assert.equal(response.status, 201);
		const value = await response.json();
		assert.deepEqual(Object.keys(value).sort(), ['courseId', 'createdAt', 'id', 'justification', 'learnerEmail', 'status', 'statusHistory', 'updatedAt']);
		assert.equal(value.courseId, 'course-001');
		assert.equal(value.learnerEmail, c.email);
		assert.equal(value.status, 'pending');
		assert.equal(value.justification, justification);
		assert.equal(new Date(value.createdAt).toISOString(), value.createdAt);
		assert.equal(value.updatedAt, value.createdAt);
		assert.deepEqual(value.statusHistory, [{ fromStatus: null, toStatus: 'pending', changedAt: value.createdAt, changedBy: 'system', reason: null }]);
		const retrieved = await c.send(`/${value.id}`);
		assert.equal(retrieved.status, 200);
		assert.deepEqual(await retrieved.json(), value);
	});
	for (const [courseId, status, code] of [
		['missing', 404, 'COURSE_NOT_FOUND'],
		['course-004', 409, 'COURSE_NOT_ACTIVE'],
		['course-006', 409, 'COURSE_NOT_ACTIVE'],
	]) {
		it(`rejects unavailable course ${courseId}`, async () => error(await client().create({ courseId }), status, code));
	}
	for (const [field, value] of [
		['learnerEmail', 'invalid'],
		['learnerEmail', 'a..b@example.org'],
		['learnerEmail', '.a@example.org'],
		['learnerEmail', 'a@-example.org'],
		['learnerEmail', '<a>@example.org'],
		['learnerEmail', 'a@@example.org'],
		['learnerEmail', 'x@example..org'],
		['learnerEmail', 7],
		['learnerEmail', null],
		['justification', 'too short'],
		['justification', 'x'.repeat(501)],
		['justification', null],
		['courseId', ''],
		['courseId', null],
	]) {
		it(`validates ${field}=${JSON.stringify(value)}`, async () => error(await client().create({ [field]: value }), 400, 'INVALID_REQUEST', field));
	}
	for (const length of [20, 500]) it(`accepts justification boundary ${length}`, async () => assert.equal((await client().create({ justification: 'x'.repeat(length) })).status, 201));
	for (const body of ['{', 'null', '[]', '"text"']) it(`rejects malformed or non-object JSON: ${body}`, async () => error(await client().send('', 'POST', body), 400, 'INVALID_REQUEST', 'body'));
	it('rejects empty JSON body', async () => error(await client().send('', 'POST'), 400, 'INVALID_REQUEST', 'body'));
	for (const status of ['pending', 'approved']) {
		it(`prevents duplicate ${status} requests, normalizing email case and whitespace`, async () => {
			const c = client();
			const value = await (await c.create()).json();
			if (status === 'approved') assert.equal((await c.change(value.id, 'approved')).status, 200);
			await error(await c.create({ learnerEmail: ` ${c.email.toUpperCase()} ` }), 409, 'DUPLICATE_ACTIVE_REQUEST');
			assert.equal((await c.create({ courseId: 'course-002' })).status, 201);
		});
	}
	it('allows only one concurrent active request', async () => {
		const c = client();
		const responses = await Promise.all(Array.from({ length: 8 }, () => c.create()));
		assert.equal(responses.filter((r) => r.status === 201).length, 1);
		assert.equal(responses.filter((r) => r.status === 409).length, 7);
	});
	for (const status of ['rejected', 'cancelled'])
		it(`permits a new request after ${status}`, async () => {
			const c = client();
			const value = await (await c.create()).json();
			assert.equal((await c.change(value.id, status, { reason: 'Prerequisite is missing.' })).status, 200);
			assert.equal((await c.create()).status, 201);
		});
	it('lists requests with each filter and combined AND filters', async () => {
		const c = client();
		const a = await (await c.create()).json();
		const b = await (await c.create({ courseId: 'course-002' })).json();
		await c.change(b.id, 'approved');
		const check = async (query, predicate, expected) => {
			const response = await c.send(query);
			assert.equal(response.status, 200);
			const values = await response.json();
			assert.ok(Array.isArray(values));
			assert.ok(values.every(predicate));
			if (expected) assert.deepEqual(values.map((x) => x.id).sort(), expected.sort());
		};
		await check(`?learnerEmail=${c.email.toUpperCase()}`, (x) => x.learnerEmail === c.email, [a.id, b.id]);
		await check('?status=approved', (x) => x.status === 'approved');
		await check('?courseId=course-001', (x) => x.courseId === 'course-001');
		await check(`?status=pending&courseId=course-001&learnerEmail=${c.email}`, (x) => x.status === 'pending' && x.courseId === 'course-001' && x.learnerEmail === c.email, [a.id]);
		await check('?courseId=does-not-exist', () => true, []);
	});
	for (const query of ['status=bad', 'learnerEmail=bad', 'courseId=', 'status=pending&status=approved', 'courseId=a&courseId=b', 'learnerEmail=a@example.org&learnerEmail=b@example.org'])
		it(`rejects invalid list filter ${query}`, async () => error(await client().send(`?${query}`), 400, 'INVALID_REQUEST'));
	it('reports missing request for retrieval and valid update', async () => {
		const c = client();
		await error(await c.send('/missing'), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
		await error(await c.change('missing', 'approved'), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
	});
	for (const next of ['approved', 'rejected', 'cancelled'])
		it(`supports pending to ${next} with audit entry`, async () => {
			const c = client();
			const initial = await (await c.create()).json();
			const response = await c.change(initial.id, next, { reason: 'Reviewer decision.' });
			assert.equal(response.status, 200);
			const updated = await response.json();
			assert.equal(updated.status, next);
			assert.equal(updated.createdAt, initial.createdAt);
			assert.equal(updated.statusHistory.length, 2);
			assert.deepEqual(updated.statusHistory[0], initial.statusHistory[0]);
			assert.deepEqual(updated.statusHistory[1], { fromStatus: 'pending', toStatus: next, changedAt: updated.updatedAt, changedBy: 'reviewer@example.org', reason: 'Reviewer decision.' });
		});
	it('supports approved to cancelled with complete audit history', async () => {
		const c = client();
		const initial = await (await c.create()).json();
		await c.change(initial.id, 'approved');
		const response = await c.change(initial.id, 'cancelled');
		assert.equal(response.status, 200);
		const updated = await response.json();
		assert.deepEqual(
			updated.statusHistory.map((x) => [x.fromStatus, x.toStatus]),
			[
				[null, 'pending'],
				['pending', 'approved'],
				['approved', 'cancelled'],
			],
		);
	});
	for (const current of ['pending', 'approved', 'rejected', 'cancelled'])
		for (const next of ['pending', 'approved', 'rejected', 'cancelled']) {
			if ((current === 'pending' && next !== 'pending') || (current === 'approved' && next === 'cancelled')) continue;
			it(`rejects ${current} to ${next} without mutating history`, async () => {
				const c = client();
				const value = await (await c.create()).json();
				if (current !== 'pending') await c.change(value.id, current, { reason: 'Reviewer decision.' });
				const before = await (await c.send(`/${value.id}`)).json();
				await error(await c.change(value.id, next, { reason: 'Reviewer decision.' }), 409, 'INVALID_STATUS_TRANSITION');
				assert.deepEqual(await (await c.send(`/${value.id}`)).json(), before);
			});
		}
	for (const extra of [{ status: 'invalid' }, { changedBy: '' }, { changedBy: 7 }, { status: 'rejected' }, { status: 'rejected', reason: '' }, { status: 'rejected', reason: '   ' }, { status: 'rejected', reason: 7 }])
		it(`validates status update ${JSON.stringify(extra)}`, async () => {
			const c = client();
			const initial = await (await c.create()).json();
			await error(await c.change(initial.id, 'approved', extra), 400, 'INVALID_REQUEST');
			assert.deepEqual(await (await c.send(`/${initial.id}`)).json(), initial);
		});
	it('rejects malformed status body without mutation', async () => {
		const c = client();
		const initial = await (await c.create()).json();
		await error(await c.send(`/${initial.id}/status`, 'PATCH', '{'), 400, 'INVALID_REQUEST', 'body');
		assert.deepEqual(await (await c.send(`/${initial.id}`)).json(), initial);
	});
	it('protects repository from mutations to service responses and isolates factories', async () => {
		const first = buildApplicationServicesFactory({ environment: 'test' });
		const service = (await first.forRequest()).enrollments;
		const created = service.create({ courseId: 'course-001', learnerEmail: 'local@example.org', justification });
		const id = created.id;
		created.status = 'approved';
		created.statusHistory.length = 0;
		const list = service.list();
		list[0].statusHistory[0].changedBy = 'tampered';
		assert.equal(service.get(id).status, 'pending');
		assert.equal(service.get(id).statusHistory[0].changedBy, 'system');
		assert.equal((await first.forRequest()).enrollments.get(id).statusHistory.length, 1);
		const other = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		assert.deepEqual(other.enrollments.list(), []);
	});
	it('keeps unexpected server errors generic', async () => {
		const app = createRestApp({ forRequest: () => Promise.reject(new Error('private details')) });
		const response = await app.request('/api/enrollment-requests');
		assert.equal(response.status, 500);
		assert.deepEqual(await response.json(), { error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } });
	});
});
