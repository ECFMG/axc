import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApplicationServicesFactory } from '../../../../axc/application-services/dist/index.js';
import { createRestApp } from '../../../../axc/rest/dist/index.js';

// Exercise the built delivery and application layers without an external host.
const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));
async function request(query = '') {
	const response = await app.request(`/api/courses${query}`);
	return { status: response.status, body: await response.json() };
}
const all = (await request('?pageSize=50')).body.items;

test('default catalog and complete course model', async () => {
	const { status, body } = await request();
	assert.equal(status, 200);
	assert.equal(body.page, 1);
	assert.equal(body.pageSize, 10);
	assert.equal(body.totalItems, 12);
	assert.equal(body.totalPages, 2);
	assert.equal(body.items.length, 10);
	assert.equal(new Set(all.map((course) => course.id)).size, 12);
	for (const course of all) {
		assert.deepEqual(Object.keys(course).sort(), ['id', 'title', 'summary', 'modality', 'status', 'tags', 'createdAt', 'updatedAt'].sort());
		assert.equal(new Date(course.createdAt).toISOString(), course.createdAt);
		assert.equal(new Date(course.updatedAt).toISOString(), course.updatedAt);
	}
});

test('keyword search matches title, summary and tags case-insensitively', async () => {
	const { body } = await request('?q=SeCuRiTy');
	assert.deepEqual(body.items.map((course) => course.id).sort(), ['course-001', 'course-002', 'course-003', 'course-011']);
	assert.equal((await request('?q=DATA')).body.totalItems, 3);
});

for (const [field, values] of Object.entries({ modality: ['online', 'in-person', 'hybrid'], status: ['draft', 'active', 'retired'], tag: ['AI', 'SECURITY', 'data'] })) {
	for (const value of values) {
		test(`${field}=${value} returns exactly the matching courses`, async () => {
			const { status, body } = await request(`?${field}=${value}&pageSize=50`);
			assert.equal(status, 200);
			const expected = all.filter((course) => (field === 'tag' ? course.tags.some((tag) => tag.toLowerCase() === value.toLowerCase()) : course[field] === value));
			assert.deepEqual(body.items, expected);
			assert.equal(body.totalItems, expected.length);
		});
	}
}

test('combined filters use AND semantics', async () => {
	assert.deepEqual(
		(await request('?q=security&modality=online&status=active&tag=AI')).body.items.map((course) => course.id),
		['course-001', 'course-011'],
	);
	assert.deepEqual(
		(await request('?modality=hybrid&status=draft&tag=ai')).body.items.map((course) => course.id),
		['course-004'],
	);
});

test('pagination preserves filtered totals and has no overlapping pages', async () => {
	const first = (await request('?page=1&pageSize=5')).body;
	const second = (await request('?page=2&pageSize=5')).body;
	const third = (await request('?page=3&pageSize=5')).body;
	assert.deepEqual([...first.items, ...second.items, ...third.items], all);
	assert.equal(first.totalPages, 3);
	assert.equal(second.page, 2);
	assert.equal(third.items.length, 2);
	assert.equal((await request('?status=active&pageSize=2&page=2')).body.totalPages, 3);
	assert.equal((await request('?pageSize=50')).body.items.length, 12);
	const beyond = (await request('?page=999')).body;
	assert.deepEqual(beyond.items, []);
	assert.equal(beyond.totalItems, 12);
});

for (const sort of ['title', 'createdAt', 'updatedAt']) {
	test(`ascending ${sort} ordering is applied before pagination`, async () => {
		const expected = [...all].sort((a, b) => a[sort].localeCompare(b[sort], 'en') || a.id.localeCompare(b.id, 'en'));
		assert.deepEqual((await request(`?sort=${sort}&pageSize=50`)).body.items, expected);
		assert.deepEqual((await request(`?sort=${sort}&pageSize=3&page=2`)).body.items, expected.slice(3, 6));
	});
}

for (const query of [
	'modality=remote',
	'status=published',
	'sort=id',
	'page=0',
	'page=-1',
	'page=1.5',
	'page=abc',
	'page=1e2',
	'page=9007199254740992',
	'pageSize=0',
	'pageSize=51',
	'pageSize=1.2',
	'pageSize=NaN',
	'pageSize=',
	'sort=',
	'modality=',
	'unknown=x',
	'page=1&page=2',
	'q=a&q=b',
	'tag=ai&tag=data',
]) {
	test(`invalid query: ${query}`, async () => {
		const { status, body } = await request(`?${query}`);
		assert.equal(status, 400);
		assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
		assert.equal(body.error.message, 'One or more query parameters are invalid.');
		assert.equal(body.error.details[0].field, query.split('=')[0]);
		assert.equal(typeof body.error.details[0].message, 'string');
	});
}

test('validation reports multiple invalid fields together', async () => {
	const { body } = await request('?status=bad&page=0&pageSize=51');
	assert.deepEqual(body.error.details.map((detail) => detail.field).sort(), ['page', 'pageSize', 'status']);
});

test('no matches returns successful empty pagination metadata', async () => {
	assert.deepEqual(await request('?q=unfindable&page=2&pageSize=5'), { status: 200, body: { items: [], page: 2, pageSize: 5, totalItems: 0, totalPages: 0 } });
});

test('blank search terms are ignored and surrounding whitespace is trimmed', async () => {
	assert.equal((await request('?q=%20&tag=%20')).body.totalItems, 12);
	assert.equal((await request('?tag=%20AI%20')).body.totalItems, 3);
});

test('returned courses cannot mutate the sample catalog', async () => {
	const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
	const query = { page: 1, pageSize: 50, sort: 'title' };
	const result = services.courses.search(query);
	result.items[0].title = 'Changed';
	result.items[0].tags.push('Changed');
	assert.deepEqual(services.courses.search(query).items, all);
});

test('health endpoint retains its existing behavior', async () => {
	const response = await app.request('/health');
	assert.equal(response.status, 200);
	assert.equal((await response.json()).status, 'ok');
});
