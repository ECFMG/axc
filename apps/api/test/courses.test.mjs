import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApplicationServicesFactory } from '@axc/application-services';
import { createRestApp } from '@axc/rest';

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));
const request = (query = '') => app.request(`/api/courses${query ? `?${query}` : ''}`);
async function page(query = '') {
	const response = await request(query);
	assert.equal(response.status, 200);
	assert.match(response.headers.get('content-type'), /application\/json/);
	return response.json();
}
const all = (await page('pageSize=50')).items;
const ids = (courses) => courses.map((course) => course.id).sort();

test('default page, model, mixed fixtures and title sort', async () => {
	const result = await page();
	assert.equal(result.page, 1);
	assert.equal(result.pageSize, 10);
	assert.equal(result.items.length, 10);
	assert.ok(all.length >= 12);
	assert.equal(result.totalItems, all.length);
	assert.equal(result.totalPages, Math.ceil(all.length / 10));
	assert.equal(new Set(all.map((course) => course.id)).size, all.length);
	assert.equal(new Set(all.map((course) => course.modality)).size, 3);
	assert.equal(new Set(all.map((course) => course.status)).size, 3);
	for (const course of all) {
		for (const key of ['id', 'title', 'summary', 'createdAt', 'updatedAt']) assert.equal(typeof course[key], 'string');
		assert.ok(Array.isArray(course.tags) && course.tags.every((tag) => typeof tag === 'string'));
		for (const key of ['createdAt', 'updatedAt']) assert.equal(new Date(course[key]).toISOString(), course[key]);
	}
	assert.deepEqual(
		result.items.map((course) => course.title.toLowerCase()),
		all
			.slice(0, 10)
			.map((course) => course.title.toLowerCase())
			.sort(),
	);
});
for (const [field, term] of [
	['title', 'Pottery'],
	['summary', 'compost'],
	['tags', 'WCAG'],
]) {
	test(`case-insensitive search matches ${field} alone`, async () => {
		const expected = all.filter((course) => [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(term.toLowerCase())));
		assert.equal(expected.length, 1);
		const other = ['title', 'summary', 'tags'].filter((key) => key !== field).flatMap((key) => (key === 'tags' ? expected[0].tags : [expected[0][key]]));
		assert.ok(other.every((value) => !value.toLowerCase().includes(term.toLowerCase())));
		assert.deepEqual(ids((await page(`q=${term.toUpperCase()}`)).items), ids(expected));
	});
}
for (const [field, values] of [
	['modality', ['online', 'in-person', 'hybrid']],
	['status', ['draft', 'active', 'retired']],
	['tag', ['AI', 'security', 'WCAG']],
]) {
	for (const value of values)
		test(`${field} filter: ${value}`, async () => {
			const expected = all.filter((course) => (field === 'tag' ? course.tags.some((tag) => tag.toLowerCase() === value.toLowerCase()) : course[field] === value));
			assert.ok(expected.length);
			const result = await page(`${field}=${value}&pageSize=50`);
			assert.deepEqual(ids(result.items), ids(expected));
			assert.equal(result.totalItems, expected.length);
		});
}
for (const query of ['q=SECURITY&modality=online&status=active', 'modality=hybrid&status=draft&tag=AI']) {
	test(`AND filters: ${query}`, async () => {
		const params = new URLSearchParams(query);
		const expected = all.filter(
			(course) =>
				(!params.has('q') || [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(params.get('q').toLowerCase()))) &&
				(!params.has('tag') || course.tags.some((tag) => tag.toLowerCase() === params.get('tag').toLowerCase())) &&
				['modality', 'status'].every((field) => !params.has(field) || course[field] === params.get(field)),
		);
		assert.ok(expected.length);
		const result = await page(`${query}&pageSize=50`);
		assert.deepEqual(ids(result.items), ids(expected));
		assert.equal(result.totalItems, expected.length);
	});
}
test('pagination boundaries, complete pages and no duplicates', async () => {
	const pages = await Promise.all([1, 2, 3].map((number) => page(`page=${number}&pageSize=5`)));
	assert.deepEqual(
		pages.flatMap((result) => result.items).map((course) => course.id),
		all.map((course) => course.id),
	);
	assert.deepEqual(
		pages.map((result) => result.page),
		[1, 2, 3],
	);
	assert.ok(pages.every((result) => result.pageSize === 5 && result.totalItems === all.length && result.totalPages === 3));
	assert.equal((await page('pageSize=1')).items.length, 1);
	assert.equal((await page('pageSize=50')).items.length, all.length);
	assert.deepEqual((await page('page=9007199254740991&pageSize=50')).items, []);
});
for (const field of ['title', 'createdAt', 'updatedAt'])
	test(`ascending sort: ${field}`, async () => {
		const result = await page(`sort=${field}&pageSize=50`);
		const values = result.items.map((course) => course[field].toLowerCase());
		assert.deepEqual(values, [...values].sort());
		assert.equal(result.totalItems, all.length);
	});
for (const query of [
	'modality=remote',
	'status=deleted',
	'sort=-title',
	'page=0',
	'page=-1',
	'page=1.5',
	'page=abc',
	'page=',
	'page=1e2',
	'page=9007199254740992',
	'pageSize=0',
	'pageSize=51',
	'pageSize=abc',
	'pageSize=',
	'pageSize=2.5',
	'pageSize=Infinity',
	'modality=',
	'status=',
	'sort=',
	'page=1&page=2',
	'q=ai&q=security',
	'unknown=x',
]) {
	test(`invalid query: ${query}`, async () => {
		const response = await request(query);
		assert.equal(response.status, 400);
		const body = await response.json();
		assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
		assert.equal(body.error.message, 'One or more query parameters are invalid.');
		assert.ok(body.error.details.some((detail) => detail.field === query.split('=')[0] && typeof detail.message === 'string'));
		if (query === 'pageSize=51') assert.equal(body.error.details[0].message, 'pageSize must be between 1 and 50.');
	});
}
test('validation collects issues before creating services', async () => {
	const rejecting = createRestApp({
		forRequest() {
			throw new Error('Invalid request must not resolve services');
		},
	});
	const response = await rejecting.request('/api/courses?page=0&status=nope&pageSize=51');
	assert.equal(response.status, 400);
	assert.equal((await response.json()).error.details.length, 3);
});
test('no matches and empty search have explicit metadata', async () => {
	assert.deepEqual(await page('q=__no_match__'), { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	assert.deepEqual(await page('q=%20%20'), await page());
	assert.deepEqual((await page('tag=__no_match__')).items, []);
});
test('service results cannot mutate subsequent requests', async () => {
	const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
	const query = { page: 1, pageSize: 50, sort: 'title' };
	const result = services.courses.search(query);
	result.items[0].title = 'Changed';
	result.items[0].tags.push('changed');
	assert.deepEqual(services.courses.search(query).items, all);
});
test('health contract stays available', async () => {
	const response = await app.request('/health');
	assert.equal(response.status, 200);
	const health = await response.json();
	assert.equal(health.status, 'ok');
	assert.equal(health.service, 'agentCourses-api');
	assert.equal(health.environment, 'test');
});
