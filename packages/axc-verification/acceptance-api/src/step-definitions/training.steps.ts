import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Given, Then, When } from '@cucumber/cucumber';
import { apiServer } from '../infrastructure.ts';
import type { AgentCoursesApiWorld } from '../world.ts';

interface TrainingState {
	status: number;
	body: Record<string, unknown>;
	email: string;
	requestId: string | undefined;
	historyLength: number;
}
const states = new WeakMap<AgentCoursesApiWorld, TrainingState>();
function state(world: AgentCoursesApiWorld): TrainingState {
	let current = states.get(world);
	if (current === undefined) {
		current = { status: 0, body: {}, email: `learner-${randomUUID()}@example.org`, requestId: undefined, historyLength: 0 };
		states.set(world, current);
	}
	return current;
}
function object(value: unknown): Record<string, unknown> {
	assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value));
	return value as Record<string, unknown>;
}
function items(value: unknown): Record<string, unknown>[] {
	assert.ok(Array.isArray(value));
	return value.map(object);
}
async function request(world: AgentCoursesApiWorld, path: string, method = 'GET', body?: Record<string, unknown>): Promise<void> {
	const response = await fetch(new URL(path, apiServer.getUrl()), { method, ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
	const current = state(world);
	current.status = response.status;
	const result: unknown = await response.json();
	current.body = Array.isArray(result) ? { items: result } : object(result);
}
async function create(world: AgentCoursesApiWorld, courseId: string, overrides: Record<string, unknown> = {}): Promise<void> {
	await request(world, '/api/enrollment-requests', 'POST', { courseId, learnerEmail: state(world).email, justification: 'I need this course to prepare for secure development work.', ...overrides });
	if (state(world).status === 201) {
		state(world).requestId = String(state(world).body['id']);
		state(world).historyLength = 1;
	}
}
When('the learner searches courses with {string}', async function (this: AgentCoursesApiWorld, query: string) {
	await request(this, `/api/courses?${query}`);
});
Then('the catalog has default pagination and all required course fields', function (this: AgentCoursesApiWorld) {
	const current = state(this);
	assert.equal(current.status, 200);
	assert.equal(current.body['page'], 1);
	assert.equal(current.body['pageSize'], 10);
	assert.equal(current.body['totalItems'], 12);
	assert.equal(current.body['totalPages'], 2);
	assert.equal(items(current.body['items']).length, 10);
	for (const course of items(current.body['items'])) {
		assert.deepEqual(Object.keys(course).sort(), ['id', 'title', 'summary', 'modality', 'status', 'tags', 'createdAt', 'updatedAt'].sort());
	}
});
Then('the matching course ids are {string}', function (this: AgentCoursesApiWorld, expected: string) {
	assert.equal(state(this).status, 200);
	assert.deepEqual(
		items(state(this).body['items'])
			.map((course) => course['id'])
			.sort(),
		expected.split(',').sort(),
	);
});
Then('every returned course matches {string} equal to {string}', function (this: AgentCoursesApiWorld, field: string, value: string) {
	assert.equal(state(this).status, 200);
	const courses = items(state(this).body['items']);
	assert.ok(courses.length > 0);
	for (const course of courses) {
		if (field === 'tags') {
			assert.ok((course[field] as string[]).includes(value));
		} else {
			assert.equal(course[field], value);
		}
	}
});
Then('at most five courses are sorted by {string} with correct metadata', function (this: AgentCoursesApiWorld, field: string) {
	assert.equal(state(this).status, 200);
	const body = state(this).body;
	const courses = items(body['items']);
	assert.equal(courses.length, 5);
	assert.equal(body['page'], 1);
	assert.equal(body['pageSize'], 5);
	assert.equal(body['totalItems'], 12);
	assert.equal(body['totalPages'], 3);
	const values = courses.map((course) => course[field]);
	assert.deepEqual(values, [...values].sort());
});
Then('the catalog returns an empty page', function (this: AgentCoursesApiWorld) {
	assert.equal(state(this).status, 200);
	assert.deepEqual(state(this).body['items'], []);
	assert.equal(state(this).body['totalItems'], 0);
	assert.equal(state(this).body['totalPages'], 0);
});
When('the learner requests enrollment for {string}', async function (this: AgentCoursesApiWorld, courseId: string) {
	await create(this, courseId);
});
When('the learner submits invalid {string} with {string}', async function (this: AgentCoursesApiWorld, field: string, value: string) {
	await create(this, 'course-001', { [field]: value });
});
Then('the workflow responds with {int} and code {string}', function (this: AgentCoursesApiWorld, status: number, code: string) {
	const current = state(this);
	assert.equal(current.status, status);
	const error = object(current.body['error']);
	assert.equal(error['code'], code);
	assert.equal(typeof error['message'], 'string');
	assert.ok(Array.isArray(error['details']));
	assert.deepEqual(Object.keys(error).sort(), ['code', 'message', 'details'].sort());
});
Then('the workflow creates a pending request with its initial history', function (this: AgentCoursesApiWorld) {
	const current = state(this);
	assert.equal(current.status, 201);
	assert.equal(current.body['status'], 'pending');
	assert.equal(current.body['courseId'], 'course-001');
	assert.equal(current.body['learnerEmail'], current.email);
	assert.equal(current.body['createdAt'], current.body['updatedAt']);
	assert.deepEqual(current.body['statusHistory'], [{ fromStatus: null, toStatus: 'pending', changedAt: current.body['createdAt'], changedBy: 'system', reason: null }]);
});
When('the learner retrieves that request', async function (this: AgentCoursesApiWorld) {
	await request(this, `/api/enrollment-requests/${state(this).requestId}`);
});
Then('the workflow returns that request including history', function (this: AgentCoursesApiWorld) {
	assert.equal(state(this).status, 200);
	assert.equal(state(this).body['id'], state(this).requestId);
	assert.equal(items(state(this).body['statusHistory']).length, 1);
});
When('the learner filters requests by each field and their combination', async function (this: AgentCoursesApiWorld) {
	const current = state(this);
	for (const query of ['status=pending', 'courseId=course-001', `learnerEmail=${current.email}`, `status=pending&courseId=course-001&learnerEmail=${current.email}`]) {
		await request(this, `/api/enrollment-requests?${query}`);
		assert.equal(current.status, 200);
		const results = items(current.body['items']);
		assert.ok(results.some((item) => item['id'] === current.requestId));
		const filters = new URLSearchParams(query);
		for (const [field, value] of filters) {
			assert.ok(results.every((item) => item[field] === value));
		}
	}
});
Then('only matching requests are returned', function (this: AgentCoursesApiWorld) {
	assert.equal(items(state(this).body['items']).length, 1);
});
Given('the learner has a {string} enrollment request', async function (this: AgentCoursesApiWorld, status: string) {
	await create(this, 'course-001');
	assert.equal(state(this).status, 201);
	if (status !== 'pending') {
		await request(this, `/api/enrollment-requests/${state(this).requestId}/status`, 'PATCH', { status, changedBy: 'reviewer@example.org', reason: 'A documented review decision' });
		assert.equal(state(this).status, 200);
		state(this).historyLength = 2;
	}
});
When('the reviewer changes its status to {string} with reason {string}', async function (this: AgentCoursesApiWorld, status: string, reason: string) {
	await request(this, `/api/enrollment-requests/${state(this).requestId}/status`, 'PATCH', { status, changedBy: 'reviewer@example.org', ...(reason.length === 0 ? {} : { reason }) });
});
Then('the workflow records a transition from {string} to {string}', async function (this: AgentCoursesApiWorld, from: string, to: string) {
	const current = state(this);
	assert.equal(current.status, 200);
	assert.equal(current.body['status'], to);
	const history = items(current.body['statusHistory']);
	assert.equal(history.length, current.historyLength + 1);
	assert.deepEqual(history.at(-1), { fromStatus: from, toStatus: to, changedAt: current.body['updatedAt'], changedBy: 'reviewer@example.org', reason: 'A documented review decision' });
	const before = current.body;
	await request(this, `/api/enrollment-requests/${current.requestId}`);
	assert.deepEqual(current.body, before);
});
When('the learner retrieves an unknown enrollment request', async function (this: AgentCoursesApiWorld) {
	await request(this, '/api/enrollment-requests/missing');
});
