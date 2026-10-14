import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildApplicationServicesFactory, searchCourses } from '../../../axc/application-services/dist/index.js';
import { createRestApp } from '../../../axc/rest/dist/index.js';

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));
const search = (query = '') => {
	const result = searchCourses(new URLSearchParams(query));
	assert.ok(!('error' in result));
	return result;
};
const all = search('pageSize=50').items;
const ids = (items) => items.map((item) => item.id).sort();
const request = (query = '') => app.request(`/api/courses${query ? `?${query}` : ''}`);

// Distinct terms prove each searchable field, rather than accidental matches elsewhere.
for (const [query, expected] of [
	['AI SECURITY FOUNDATIONS', 'course-001'],
	['SENSITIVE RECORDS', 'course-006'],
	['DEVOPS', 'course-012'],
]) {
	test(`keyword search: ${query}`, () => assert.deepEqual(ids(search(`q=${encodeURIComponent(query)}`).items), [expected]));
}

test('complete model and twelve varied fixtures', () => {
	assert.equal(all.length, 12);
	assert.equal(new Set(ids(all)).size, 12);
	assert.equal(new Set(all.map((c) => c.modality)).size, 3);
	assert.equal(new Set(all.map((c) => c.status)).size, 3);
	for (const course of all) {
		for (const field of ['id', 'title', 'summary']) assert.ok(typeof course[field] === 'string' && course[field].length > 0);
		assert.ok(course.tags.every((tag) => typeof tag === 'string'));
		for (const field of ['createdAt', 'updatedAt']) assert.equal(new Date(course[field]).toISOString(), course[field]);
		assert.ok(course.createdAt <= course.updatedAt);
	}
});

test('default list and HTTP contract', async () => {
	const response = await request();
	assert.equal(response.status, 200);
	assert.match(response.headers.get('content-type'), /application\/json/);
	assert.deepEqual(await response.json(), { items: all.slice(0, 10), page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
});

for (const [field, values] of [
	['modality', ['online', 'in-person', 'hybrid']],
	['status', ['draft', 'active', 'retired']],
]) {
	for (const value of values) {
		test(`${field}=${value}`, () => {
			const result = search(`${field}=${value}`);
			assert.deepEqual(ids(result.items), ids(all.filter((c) => c[field] === value)));
			assert.ok(result.totalItems > 0);
		});
	}
}

test('case-insensitive exact tag filter', () => {
	assert.deepEqual(ids(search('tag=AI').items), ['course-001', 'course-004', 'course-009']);
	assert.deepEqual(search('tag=a').items, []);
});

for (const [query, expected] of [
	['q=SECURITY&modality=online&status=active', ['course-001']],
	['modality=hybrid&status=draft&tag=AI', ['course-004']],
]) {
	test(`combined filters: ${query}`, async () => {
		const response = await request(query);
		assert.equal(response.status, 200);
		const result = await response.json();
		assert.deepEqual(ids(result.items), expected);
		assert.equal(result.totalItems, expected.length);
	});
}

test('pagination slices sorted results and retains metadata', () => {
	const result = search('page=2&pageSize=5');
	assert.deepEqual(result, { items: all.slice(5, 10), page: 2, pageSize: 5, totalItems: 12, totalPages: 3 });
	assert.equal(search('pageSize=1').items.length, 1);
	assert.equal(search('pageSize=50').items.length, 12);
	assert.deepEqual(search('page=9007199254740991&pageSize=50').items, []);
	assert.deepEqual(search('page=4&pageSize=5').items, []);
});

for (const field of ['title', 'createdAt', 'updatedAt']) {
	test(`ascending ${field} before pagination`, () => {
		const sorted = [...all].sort((a, b) => (a[field].toLowerCase() < b[field].toLowerCase() ? -1 : 1));
		assert.deepEqual(search(`sort=${field}&pageSize=50`).items, sorted);
		assert.deepEqual(search(`sort=${field}&page=2&pageSize=3`).items, sorted.slice(3, 6));
	});
}

for (const query of [
	'modality=invalid',
	'status=invalid',
	'sort=invalid',
	'modality=',
	'status=',
	'sort=',
	'page=0',
	'page=-1',
	'page=1.5',
	'page=bad',
	'page=',
	'page=1e2',
	'page=%202',
	'page=9007199254740992',
	'pageSize=0',
	'pageSize=51',
	'pageSize=bad',
	'pageSize=1.5',
	'pageSize=',
	'pageSize=Infinity',
	'page=1&page=2',
	'q=a&q=b',
	'unknown=x',
]) {
	test(`invalid query: ${query}`, async () => {
		const response = await request(query);
		assert.equal(response.status, 400);
		const result = await response.json();
		assert.equal(result.error.code, 'INVALID_QUERY_PARAMETER');
		assert.equal(result.error.message, 'One or more query parameters are invalid.');
		assert.ok(result.error.details.some((detail) => detail.field === query.split('=')[0] && typeof detail.message === 'string'));
		if (query === 'pageSize=51') assert.equal(result.error.details[0].message, 'pageSize must be between 1 and 50.');
	});
}

test('returns all validation failures together', async () => {
	const response = await request('modality=invalid&status=invalid&page=0&pageSize=51&sort=invalid');
	const result = await response.json();
	assert.equal(response.status, 400);
	assert.deepEqual(result.error.details.map((detail) => detail.field).sort(), ['modality', 'page', 'pageSize', 'sort', 'status']);
});

test('no matching courses is successful with zero totals', async () => {
	const response = await request('q=__absent__');
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
});

test('whitespace and empty text queries have documented behavior', () => {
	assert.deepEqual(search('q=%20%20').items, search().items);
	assert.deepEqual(ids(search('tag=%20AI%20').items), ['course-001', 'course-004', 'course-009']);
	assert.deepEqual(search('tag=').items, []);
});

test('callers cannot corrupt later requests by editing returned courses', () => {
	const original = search('pageSize=1');
	const result = search('pageSize=1');
	result.items[0].title = 'Corrupted';
	result.items[0].tags.push('corrupted');
	assert.deepEqual(search('pageSize=1'), original);
});

test('health remains intact and courses forward authorization through existing factory', async () => {
	const headers = [];
	const factory = buildApplicationServicesFactory({ environment: 'test' });
	const observed = createRestApp({
		forRequest(header) {
			headers.push(header);
			return factory.forRequest(header);
		},
	});
	assert.equal((await observed.request('/health')).status, 200);
	assert.equal((await observed.request('/api/courses', { headers: { Authorization: 'Bearer local-test' } })).status, 200);
	assert.deepEqual(headers, [undefined, 'Bearer local-test']);
});
