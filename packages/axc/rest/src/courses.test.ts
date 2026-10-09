import { buildApplicationServicesFactory, type CoursePage } from '@axc/application-services';
import { createFixtureCourseCatalog } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const repository = createFixtureCourseCatalog();
const app = createRestApp(buildApplicationServicesFactory({ environment: 'test', courseCatalog: repository }));
async function request(query = '') {
	const response = await app.request(`/api/courses${query}`);
	expect(response.status).toBe(200);
	return (await response.json()) as CoursePage;
}

describe('GET /api/courses', () => {
	it('returns the seeded catalog with default pagination and title sorting', async () => {
		const result = await request();
		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(result.items).toHaveLength(10);
		expect(result.items[0]).toEqual({
			id: 'course-001',
			title: 'AI Security Foundations',
			summary: 'Introductory course on secure AI-assisted development.',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: '2026-01-15T00:00:00.000Z',
			updatedAt: '2026-06-01T00:00:00.000Z',
		});
	});

	it.each([
		['SECURITY', ['course-001', 'course-006', 'course-012']],
		['FOUNDATIONS', ['course-001']],
		['responsible', ['course-004']],
		['ACCESSIBILITY', ['course-005']],
	])('searches title, summary and tags case-insensitively: %s', async (q, ids) => {
		expect((await request(`?q=${q}`)).items.map((course) => course.id)).toEqual(ids);
	});

	it.each([
		['modality', 'online', 4],
		['modality', 'in-person', 4],
		['modality', 'hybrid', 4],
		['status', 'active', 7],
		['status', 'draft', 3],
		['status', 'retired', 2],
	])('filters %s=%s', async (field, value, totalItems) => {
		const result = await request(`?${field}=${value}`);
		expect(result.totalItems).toBe(totalItems);
		expect(result.items.every((course) => (field === 'modality' ? course.modality === value : course.status === value))).toBe(true);
	});

	it('matches whole tags ignoring case', async () => {
		expect((await request('?tag=AI')).items.map((course) => course.id)).toEqual(['course-001', 'course-004', 'course-008', 'course-012']);
		expect((await request('?tag=secur')).totalItems).toBe(0);
	});

	it.each([
		['?q=SECURITY&modality=online&status=active&tag=AI', ['course-001']],
		['?modality=hybrid&status=draft&tag=data', ['course-008']],
	])('combines all supplied filters with AND: %s', async (query, ids) => {
		expect((await request(query)).items.map((course) => course.id)).toEqual(ids);
	});

	it('paginates after filtering and sorting with accurate totals', async () => {
		const all = await request('?pageSize=50');
		const first = await request('?page=1&pageSize=5');
		const second = await request('?page=2&pageSize=5');
		const last = await request('?page=3&pageSize=5');
		expect(first).toMatchObject({ page: 1, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect([...first.items, ...second.items, ...last.items]).toEqual(all.items);
		expect(last.items).toHaveLength(2);
		expect((await request('?status=active&page=2&pageSize=5')).items).toHaveLength(2);
		expect((await request('?page=99')).items).toEqual([]);
	});

	it.each(['title', 'createdAt', 'updatedAt'] as const)('sorts ascending by %s', async (sort) => {
		const result = await request(`?sort=${sort}&pageSize=50`);
		const fields = result.items.map((course) => course[sort]);
		expect(fields).toEqual([...fields].sort((a, b) => a.localeCompare(b)));
	});

	it('returns empty items and zero totalPages for no matches', async () => {
		expect(await request('?q=does-not-exist')).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('treats blank search terms as no filter and trims search terms', async () => {
		expect((await request('?q=%20&tag=')).totalItems).toBe(12);
		expect((await request('?q=%20SECURITY%20&tag=%20AI%20')).totalItems).toBe(2);
	});

	it.each([
		['modality', 'remote'],
		['modality', 'ONLINE'],
		['status', 'unknown'],
		['sort', 'id'],
		['page', '0'],
		['page', '-1'],
		['page', '1.5'],
		['page', 'abc'],
		['page', '1e2'],
		['page', '9007199254740992'],
		['page', ''],
		['pageSize', '0'],
		['pageSize', '-1'],
		['pageSize', '51'],
		['pageSize', '2.5'],
		['pageSize', 'Infinity'],
		['pageSize', ''],
		['modality', ''],
		['status', ''],
		['sort', ''],
		['unknown', 'value'],
	])('rejects invalid %s=%s using the error contract', async (field, value) => {
		const response = await app.request(`/api/courses?${field}=${value}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field, message: expect.any(String) }] } });
	});

	it('rejects duplicate parameters and reports multiple validation errors', async () => {
		const response = await app.request('/api/courses?page=1&page=2&pageSize=51&sort=invalid');
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: { details: [{ field: 'page' }, { field: 'sort' }, { field: 'pageSize', message: 'pageSize must be between 1 and 50.' }] } });
	});

	it('keeps fixtures isolated from caller mutations', async () => {
		const first = await repository.list();
		const second = await repository.list();
		expect(first).toEqual(second);
		expect(first[0]).not.toBe(second[0]);
		expect(first[0]?.tags).not.toBe(second[0]?.tags);
	});
});
