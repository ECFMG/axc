import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, test } from 'node:test';
import { buildApplicationServicesFactory } from '@axc/application-services';
import { createRestApp } from '@axc/rest';

const factory = buildApplicationServicesFactory({ environment: 'test' });
const app = createRestApp(factory);
let server;
let origin;
before(async () => {
	server = createServer(async (request, response) => {
		const result = await app.fetch(new Request(new URL(request.url, origin), { headers: request.headers }));
		response.writeHead(result.status, Object.fromEntries(result.headers));
		response.end(await result.text());
	});
	await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
 });
	origin = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
	await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});
const get = (query = '') => fetch(`${origin}/api/courses${query}`);

test('GET courses returns JSON with defaults over HTTP', async () => {
	const response = await get();
	assert.equal(response.status, 200);
	assert.match(response.headers.get('content-type'), /application\/json/);
	const body = await response.json();
	assert.equal(body.items.length, 10);
	assert.equal(body.page, 1);
	assert.equal(body.pageSize, 10);
	assert.equal(body.totalItems, 15);
	assert.equal(body.totalPages, 2);
});
test('combined filters and tag matching pass through HTTP', async () => {
	const body = await (await get('?q=SECURITY&modality=online&status=active&tag=AI')).json();
	assert.deepEqual(
		body.items.map((c) => c.id),
		['course-001'],
	);
	const second = await (await get('?modality=hybrid&status=draft&tag=AI')).json();
	assert.deepEqual(
		second.items.map((c) => c.id),
		['course-007'],
	);
});
test('pagination and date sorting pass through HTTP', async () => {
	const body = await (await get('?page=2&pageSize=5&sort=createdAt')).json();
	assert.equal(body.page, 2);
	assert.equal(body.totalPages, 3);
	assert.deepEqual(
		body.items.map((c) => c.id),
		['course-006', 'course-007', 'course-008', 'course-009', 'course-010'],
	);
});
for (const query of ['modality=bad', 'status=bad', 'page=0', 'pageSize=51', 'sort=bad', 'page=1&page=2', 'pageSize=1e1', 'q=', 'tag=', 'unknown=1']) {
	test(`invalid query returns consistent 400: ${query}`, async () => {
		const response = await get(`?${query}`);
		assert.equal(response.status, 400);
		const body = await response.json();
		assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
		assert.equal(body.error.message, 'One or more query parameters are invalid.');
		assert.ok(body.error.details.some((d) => d.field === query.split('=')[0]));
	});
}
test('no matches is a successful empty page', async () => {
	const response = await get('?q=__no_such_course__');
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
});
test('health remains available', async () => {
	const response = await fetch(`${origin}/health`);
	assert.equal(response.status, 200);
	assert.equal((await response.json()).service, 'agentCourses-api');
});
test('both routes preserve authorization header forwarding', async () => {
	const seen = [];
	const tracked = createRestApp({
		forRequest: async (...args) => {
			seen.push(args);
			return factory.forRequest(...args);
		},
	});
	await tracked.request('/api/courses', { headers: { Authorization: 'Bearer sample' } });
	await tracked.request('/health', { headers: { Authorization: 'Bearer sample' } });
	await tracked.request('/api/courses');
	assert.deepEqual(seen, [['Bearer sample'], ['Bearer sample'], []]);
});
