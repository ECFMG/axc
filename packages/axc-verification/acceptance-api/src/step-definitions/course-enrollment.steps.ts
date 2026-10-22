import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { When } from '@cucumber/cucumber';
import { actorCalled } from '@serenity-js/core';
import { GetRequest, LastResponse, PatchRequest, PostRequest, Send } from '@serenity-js/rest';

interface RecordBody {
	id: string;
	courseId: string;
	learnerEmail: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	statusHistory: { fromStatus: string | null; toStatus: string; changedBy: string; reason: string | null; changedAt: string }[];
}
interface SearchBody {
	items: { id: string; modality: string; status: string; tags: string[]; createdAt: string }[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
const actor = () => actorCalled('API client');
async function get<T>(path: string): Promise<{ status: number; body: T }> {
	await actor().attemptsTo(Send.a(GetRequest.to(path)));
	return { status: await actor().answer(LastResponse.status()), body: await actor().answer(LastResponse.body<T>()) };
}
async function write<T>(path: string, method: 'POST' | 'PATCH', body: object): Promise<{ status: number; body: T }> {
	await actor().attemptsTo(Send.a(method === 'POST' ? PostRequest.to(path).with(body) : PatchRequest.to(path).with(body)));
	return { status: await actor().answer(LastResponse.status()), body: await actor().answer(LastResponse.body<T>()) };
}
const base = '/api/enrollment-requests';
const email = () => `acceptance-${randomUUID()}@example.org`;
const input = (learnerEmail = email(), courseId = 'course-001') => ({ courseId, learnerEmail, justification: 'This course prepares me for upcoming engineering work.' });
const create = (value = input()) => write<RecordBody>(base, 'POST', value);
const change = (id: string, status: string, reason?: string) => write<RecordBody>(`${base}/${id}/status`, 'PATCH', { status, changedBy: 'reviewer@example.org', ...(reason !== undefined ? { reason } : {}) });
When('the client verifies the course search contract', async () => {
	const defaults = await get<SearchBody>('/api/courses');
	assert.equal(defaults.status, 200);
	assert.equal(defaults.body.page, 1);
	assert.equal(defaults.body.pageSize, 10);
	assert.equal(defaults.body.totalItems, 12);
	assert.equal(defaults.body.items.length, 10);
	for (const [query, count] of [
		['q=SECURITY', 3],
		['q=ASSISTED', 1],
		['q=maintenance', 1],
		['modality=online', 5],
		['status=active', 8],
		['tag=AI', 3],
		['q=security&modality=online&status=active', 1],
		['tag=ai&status=active', 2],
	] as const) {
		const result = await get<SearchBody>(`/api/courses?${query}`);
		assert.equal(result.status, 200);
		assert.equal(result.body.totalItems, count);
	}
	const page = await get<SearchBody>('/api/courses?page=2&pageSize=5');
	assert.equal(page.body.items.length, 5);
	assert.equal(page.body.page, 2);
	assert.equal(page.body.totalPages, 3);
	const sorted = await get<SearchBody>('/api/courses?sort=createdAt&pageSize=50');
	assert.equal(sorted.body.items.length, 12);
	const dates = sorted.body.items.map((c) => c.createdAt);
	assert.deepEqual(dates, [...dates].sort());
	for (const query of ['modality=bad', 'status=bad', 'page=0', 'pageSize=51', 'sort=bad', 'page=99999999999999999999', 'tag=']) assert.equal((await get(`/api/courses?${query}`)).status, 400);
	const empty = await get<SearchBody>('/api/courses?q=no-such-course');
	assert.equal(empty.status, 200);
	assert.deepEqual(empty.body.items, []);
});
When('the client verifies enrollment creation and history', async () => {
	const created = await create();
	assert.equal(created.status, 201);
	assert.equal(created.body.status, 'pending');
	assert.deepEqual(created.body.statusHistory, [{ fromStatus: null, toStatus: 'pending', changedAt: created.body.createdAt, changedBy: 'system', reason: null }]);
	assert.deepEqual((await get<RecordBody>(`${base}/${created.body.id}`)).body, created.body);
	const approved = await change(created.body.id, 'approved');
	assert.equal(approved.status, 200);
	const cancelled = await change(created.body.id, 'cancelled', 'Schedule changed');
	assert.equal(cancelled.status, 200);
	assert.equal(cancelled.body.statusHistory.length, 3);
	assert.deepEqual(
		cancelled.body.statusHistory.map((h) => h.toStatus),
		['pending', 'approved', 'cancelled'],
	);
	assert.deepEqual(cancelled.body.statusHistory[2], { fromStatus: 'approved', toStatus: 'cancelled', changedAt: cancelled.body.updatedAt, changedBy: 'reviewer@example.org', reason: 'Schedule changed' });
	assert.deepEqual((await get<RecordBody>(`${base}/${created.body.id}`)).body, cancelled.body);
});
When('the client verifies enrollment input errors', async () => {
	for (const [override, status, code] of [
		[{ courseId: 'missing' }, 404, 'COURSE_NOT_FOUND'],
		[{ courseId: 'course-004' }, 409, 'COURSE_NOT_ACTIVE'],
		[{ courseId: 'course-005' }, 409, 'COURSE_NOT_ACTIVE'],
		[{ learnerEmail: 'invalid' }, 400, 'INVALID_REQUEST'],
		[{ justification: 'short' }, 400, 'INVALID_REQUEST'],
		[{ justification: 'x'.repeat(501) }, 400, 'INVALID_REQUEST'],
	] as const) {
		const result = await write<{ error: { code: string } }>(base, 'POST', { ...input(), ...override });
		assert.equal(result.status, status);
		assert.equal(result.body.error.code, code);
	}
	const request = await create();
	const rejected = await change(request.body.id, 'rejected', ' ');
	assert.equal(rejected.status, 400);
	assert.equal((await get<RecordBody>(`${base}/${request.body.id}`)).body.status, 'pending');
	for (const result of [await get<{ error: { code: string } }>(`${base}/missing`), await write<{ error: { code: string } }>(`${base}/missing/status`, 'PATCH', { status: 'approved', changedBy: 'reviewer' })]) {
		assert.equal(result.status, 404);
		assert.equal(result.body.error.code, 'ENROLLMENT_REQUEST_NOT_FOUND');
	}
	assert.equal((await change(request.body.id, 'unknown')).status, 400);
});
When('the client verifies enrollment duplicate prevention', async () => {
	const value = input();
	const first = await create(value);
	assert.equal(first.status, 201);
	for (const status of ['pending', 'approved']) {
		if (status === 'approved') assert.equal((await change(first.body.id, status)).status, 200);
		const duplicate = await write<{ error: { code: string } }>(base, 'POST', { ...value, learnerEmail: value.learnerEmail.toUpperCase() });
		assert.equal(duplicate.status, 409);
		assert.equal(duplicate.body.error.code, 'DUPLICATE_ACTIVE_REQUEST');
	}
	assert.equal((await change(first.body.id, 'cancelled')).status, 200);
	assert.equal((await create(value)).status, 201);
});
When('the client verifies enrollment filtering', async () => {
	const learner = email();
	const first = await create(input(learner));
	const second = await create(input(learner, 'course-002'));
	assert.equal(first.status, 201);
	assert.equal(second.status, 201);
	await change(first.body.id, 'approved');
	for (const [query, ids] of [
		[`learnerEmail=${learner}`, [first.body.id, second.body.id]],
		[`learnerEmail=${learner}&status=approved`, [first.body.id]],
		[`learnerEmail=${learner}&courseId=course-002`, [second.body.id]],
		[`learnerEmail=${learner}&courseId=course-001&status=pending`, []],
	] as const) {
		const result = await get<{ items: RecordBody[] }>(`${base}?${query}`);
		assert.equal(result.status, 200);
		assert.deepEqual(result.body.items.map((r) => r.id).sort(), [...ids].sort());
	}
});
When('the client verifies enrollment transitions', async () => {
	for (const target of ['approved', 'rejected', 'cancelled']) {
		const request = await create();
		assert.equal(request.status, 201);
		const updated = await change(request.body.id, target, 'Reviewer decision');
		assert.equal(updated.status, 200);
		assert.equal(updated.body.status, target);
		assert.equal(updated.body.statusHistory.length, 2);
		if (target === 'approved') {
			assert.equal((await change(request.body.id, 'cancelled')).status, 200);
		} else {
			const invalid = await write<{ error: { code: string } }>(`${base}/${request.body.id}/status`, 'PATCH', { status: 'approved', changedBy: 'reviewer' });
			assert.equal(invalid.status, 409);
			assert.equal(invalid.body.error.code, 'INVALID_STATUS_TRANSITION');
			assert.deepEqual((await get<RecordBody>(`${base}/${request.body.id}`)).body, updated.body);
		}
	}
});
