import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApplicationServicesFactory } from '@axc/application-services';
import { createRestApp, restHandlerCreator } from '@axc/rest';

const factory = buildApplicationServicesFactory({ environment: 'test' });
const app = createRestApp(factory);

test('Hono returns default course contract and preserves health', async () => {
	const response = await app.request('/api/courses');
	assert.equal(response.status, 200);
	assert.match(response.headers.get('content-type'), /application\/json/);
	const body = await response.json();
	assert.equal(body.items.length, 10);
	assert.deepEqual([body.page, body.pageSize, body.totalItems, body.totalPages], [1, 10, 12, 2]);
	const health = await app.request('/health');
	assert.equal(health.status, 200);
	assert.equal((await health.json()).service, 'agentCourses-api');
});

test('Hono composes keyword, enum and tag filters before pagination', async () => {
	const response = await app.request('/api/courses?q=SECURITY&modality=online&status=active&tag=AI&pageSize=1');
	assert.equal(response.status, 200);
	const body = await response.json();
	assert.equal(body.totalItems, 1);
	assert.equal(body.items[0].id, 'course-001');
	const second = await app.request('/api/courses?modality=hybrid&status=draft&tag=AI&sort=updatedAt');
	assert.deepEqual(
		(await second.json()).items.map((course) => course.id),
		['course-010', 'course-004'],
	);
});

test('Hono rejects raw invalid, repeated and unknown query parameters', async () => {
	for (const query of ['page=1.2', 'pageSize=51', 'modality=invalid', 'status=invalid', 'sort=invalid', 'page=1&page=2', 'extra=yes']) {
		const response = await app.request(`/api/courses?${query}`);
		assert.equal(response.status, 400, query);
		const body = await response.json();
		assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
		assert.equal(body.error.message, 'One or more query parameters are invalid.');
		assert.equal(body.error.details[0].field, query.split('=')[0]);
	}
});

test('Hono returns empty success', async () => {
	const response = await app.request('/api/courses?q=__missing__');
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
});

test('both routes preserve request factory authorization forwarding', async () => {
	const seen = [];
	const injected = createRestApp({
		forRequest: (...args) => {
			seen.push(args);
			return factory.forRequest(...args);
		},
	});
	for (const route of ['/health', '/api/courses']) {
		await injected.request(route);
		await injected.request(route, { headers: { Authorization: 'Bearer test-only' } });
	}
	assert.deepEqual(seen, [[], ['Bearer test-only'], [], ['Bearer test-only']]);
});

test('Azure adapter serves course request through public handler', async () => {
	const handler = restHandlerCreator(factory);
	const response = await handler({ url: 'http://localhost/api/courses?tag=AI', method: 'GET', headers: new Headers(), body: null }, {});
	assert.equal(response.status, 200);
	const chunks = [];
	for await (const chunk of response.body) chunks.push(Buffer.from(chunk));
	const body = JSON.parse(Buffer.concat(chunks).toString());
	assert.equal(body.totalItems, 3);
	assert.ok(body.items.every((course) => course.tags.includes('ai')));
});
