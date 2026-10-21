import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildApplicationServicesFactory, type CoursePage } from '@axc/application-services';
import { createRestApp } from '@axc/rest';

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));
const request = (query = '') => app.request(`/api/courses${query ? `?${query}` : ''}`);
async function page(query = ''): Promise<CoursePage> {
	const response = await request(query);
	assert.equal(response.status, 200);
	assert.match(response.headers.get('content-type') ?? '', /application\/json/);
	return response.json();
}
const ids = (result: CoursePage) => result.items.map((course) => course.id);

describe('GET /api/courses', () => {
	it('returns defaults and every required model field', async () => {
		const result = await page();
		assert.deepEqual({ ...result, items: [] }, { items: [], page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		assert.equal(result.items.length, 10);
		assert.equal(result.items[0]?.title, 'AI Security Foundations');
		for (const course of result.items) assert.deepEqual(Object.keys(course).sort(), ['createdAt', 'id', 'modality', 'status', 'summary', 'tags', 'title', 'updatedAt']);
	});
	for (const [keyword, expected] of [
		['gArDeNiNg', ['course-002']],
		['CoMpOsTiNg', ['course-002']],
		['wCaG', ['course-003']],
		['SeCuRiTy', ['course-001', 'course-008', 'course-012']],
	] as const) {
		it(`searches title, summary or tags case-insensitively: ${keyword}`, async () => assert.deepEqual(ids(await page(`q=${keyword}`)), expected));
	}
	for (const modality of ['online', 'in-person', 'hybrid']) {
		it(`filters modality=${modality}`, async () => {
			const result = await page(`modality=${modality}`);
			assert.equal(result.totalItems, 4);
			assert.ok(result.items.every((course) => course.modality === modality));
		});
	}
	for (const [status, count] of [
		['active', 7],
		['draft', 3],
		['retired', 2],
	] as const) {
		it(`filters status=${status}`, async () => {
			const result = await page(`status=${status}`);
			assert.equal(result.totalItems, count);
			assert.ok(result.items.every((course) => course.status === status));
		});
	}
	it('matches a whole tag case-insensitively', async () => {
		assert.deepEqual(ids(await page('tag=AI')), ['course-001', 'course-012']);
		assert.equal((await page('tag=secur')).totalItems, 0);
	});
	it('combines keyword, modality, status and tag with AND', async () => {
		assert.deepEqual(ids(await page('q=security&modality=online&status=active&tag=ai')), ['course-001']);
		assert.deepEqual(ids(await page('status=draft&modality=hybrid&tag=AI')), ['course-012']);
		assert.equal((await page('q=security&modality=in-person&status=active')).totalItems, 0);
	});
	it('paginates without gaps or duplicates and reports totals before pagination', async () => {
		const all = await page('pageSize=50');
		const results = await Promise.all([1, 2, 3].map((number) => page(`page=${number}&pageSize=5`)));
		assert.deepEqual(results.flatMap(ids), ids(all));
		assert.deepEqual(
			results.map((result) => result.items.length),
			[5, 5, 2],
		);
		assert.ok(results.every((result) => result.totalItems === 12 && result.totalPages === 3));
		assert.equal((await page('pageSize=1')).items.length, 1);
		assert.deepEqual(await page('page=9007199254740991&pageSize=50'), { items: [], page: Number.MAX_SAFE_INTEGER, pageSize: 50, totalItems: 12, totalPages: 1 });
	});
	for (const sort of ['title', 'createdAt', 'updatedAt'] as const) {
		it(`sorts ascending by ${sort}`, async () => {
			const result = await page(`sort=${sort}&pageSize=50`);
			const values = result.items.map((course) => course[sort].toLowerCase());
			assert.deepEqual(values, [...values].sort());
		});
	}
	it('returns valid empty metadata for no matches and whitespace-only keyword', async () => {
		assert.deepEqual(await page('q=unfindable'), { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		assert.equal((await page('q=%20%20')).totalItems, 12);
	});
	for (const query of [
		'modality=remote',
		'modality=Online',
		'modality=',
		'status=deleted',
		'status=',
		'sort=id',
		'sort=',
		'page=0',
		'page=-1',
		'page=1.5',
		'page=1e2',
		'page=NaN',
		'page=9007199254740992',
		'page=',
		'pageSize=0',
		'pageSize=51',
		'pageSize=-1',
		'pageSize=2.5',
		'pageSize=Infinity',
		'pageSize=',
		'pageSize=%205',
		'page=1&page=2',
		'q=a&q=b',
		'tag=ai&tag=data',
	]) {
		it(`rejects invalid query: ${query}`, async () => {
			const response = await request(query);
			assert.equal(response.status, 400);
			const body = await response.json();
			assert.deepEqual(Object.keys(body), ['error']);
			assert.equal(body.error.code, 'INVALID_QUERY_PARAMETER');
			assert.equal(body.error.message, 'One or more query parameters are invalid.');
			assert.ok(body.error.details.length > 0);
			assert.equal(body.error.details[0].field, query.split('=')[0]);
			assert.equal(typeof body.error.details[0].message, 'string');
		});
	}
	it('returns the exact specified envelope and validates before filtering', async () => {
		const response = await request('q=unfindable&pageSize=51');
		assert.equal(response.status, 400);
		assert.deepEqual(await response.json(), { error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }] } });
	});
	it('aggregates validation issues', async () => {
		const response = await request('page=0&status=broken');
		assert.equal(response.status, 400);
		assert.deepEqual(
			(await response.json()).error.details.map((issue: { field: string }) => issue.field),
			['page', 'status'],
		);
	});
	it('preserves the existing health endpoint', async () => {
		const response = await app.request('/health');
		assert.equal(response.status, 200);
		assert.equal((await response.json()).service, 'agentCourses-api');
	});
	it('passes the existing authorization header through the factory', async () => {
		const headers: (string | undefined)[] = [];
		const factory = buildApplicationServicesFactory({ environment: 'test' });
		const recordingApp = createRestApp({
			forRequest: (header?: string) => {
				headers.push(header);
				return factory.forRequest(header);
			},
		});
		assert.equal((await recordingApp.request('/api/courses', { headers: { Authorization: 'test-only' } })).status, 200);
		assert.equal((await recordingApp.request('/api/courses')).status, 200);
		assert.deepEqual(headers, ['test-only', undefined]);
	});
});
