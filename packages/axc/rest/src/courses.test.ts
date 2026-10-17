import { buildApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));
interface Course {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}
interface Catalog {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
async function catalog(query = ''): Promise<Catalog> {
	const response = await app.request(`/api/courses${query}`);
	expect(response.status).toBe(200);
	return response.json();
}

describe('GET /api/courses', () => {
	it('defaults to page 1, ten items and title order; supplies the complete course model', async () => {
		const result = await catalog();
		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(result.items).toHaveLength(10);
		expect(result.items.map((c) => c.title)).toEqual(result.items.map((c) => c.title).sort((a, b) => a.localeCompare(b)));
		for (const course of (await catalog('?pageSize=50')).items) {
			expect(course).toEqual({
				id: expect.any(String),
				title: expect.any(String),
				summary: expect.any(String),
				modality: expect.stringMatching(/^(online|in-person|hybrid)$/),
				status: expect.stringMatching(/^(draft|active|retired)$/),
				tags: expect.any(Array),
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
			expect(new Date(course.createdAt).toISOString()).toBe(course.createdAt);
			expect(new Date(course.updatedAt).toISOString()).toBe(course.updatedAt);
		}
		const all = (await catalog('?pageSize=50')).items;
		expect(new Set(all.map((c) => c.id)).size).toBe(12);
		expect(new Set(all.map((c) => c.modality)).size).toBe(3);
		expect(new Set(all.map((c) => c.status)).size).toBe(3);
	});
	it('matches security in title, summary and tags regardless of case', async () => {
		expect((await catalog('?q=SeCuRiTy')).items.map((c) => c.id)).toEqual(['course-001', 'course-002', 'course-006', 'course-012']);
	});
	it.each(['online', 'in-person', 'hybrid'])('filters modality %s', async (modality) => {
		const result = await catalog(`?modality=${modality}`);
		expect(result.totalItems).toBe(4);
		expect(result.items.every((c) => c.modality === modality)).toBe(true);
	});
	it.each(['active', 'draft', 'retired'])('filters status %s', async (status) => {
		const result = await catalog(`?status=${status}`);
		expect(result.totalItems).toBeGreaterThan(0);
		expect(result.items.every((c) => c.status === status)).toBe(true);
	});
	it('matches whole tags regardless of case', async () => {
		expect((await catalog('?tag=AI')).items.map((c) => c.id)).toEqual(['course-001', 'course-004', 'course-011']);
		expect((await catalog('?tag=secur')).items).toEqual([]);
	});
	it.each([
		['?q=security&modality=online&status=active', ['course-001']],
		['?tag=AI&modality=hybrid&status=active', ['course-011']],
	])('combines all filters with AND: %s', async (query, ids) => {
		expect((await catalog(query)).items.map((c) => c.id)).toEqual(ids);
	});
	it('paginates after filtering and sorting without overlap', async () => {
		const first = await catalog('?page=1&pageSize=5');
		const second = await catalog('?page=2&pageSize=5');
		const last = await catalog('?page=3&pageSize=5');
		expect(first).toMatchObject({ page: 1, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect(first.items).toHaveLength(5);
		expect(second.items).toHaveLength(5);
		expect(last.items).toHaveLength(2);
		expect([...first.items, ...second.items, ...last.items]).toEqual((await catalog('?pageSize=50')).items);
		expect(await catalog('?modality=online&page=2&pageSize=3')).toMatchObject({ totalItems: 4, totalPages: 2, items: [expect.objectContaining({ modality: 'online' })] });
	});
	it.each(['title', 'createdAt', 'updatedAt'] as const)('sorts ascending by %s before pagination', async (sort) => {
		const all = (await catalog(`?sort=${sort}&pageSize=50`)).items;
		expect(all.map((c) => c[sort])).toEqual(all.map((c) => c[sort]).sort((a, b) => a.localeCompare(b)));
		expect((await catalog(`?sort=${sort}&pageSize=5`)).items).toEqual(all.slice(0, 5));
	});
	it.each(['?q=does-not-exist', '?page=99', '?modality=online&status=retired&tag=ai'])('returns empty pages for %s', async (query) => {
		const result = await catalog(query);
		expect(result.items).toEqual([]);
		expect(result.totalPages).toBe(query === '?page=99' ? 2 : 0);
	});
	it.each([
		['modality', 'remote'],
		['status', 'unknown'],
		['sort', 'id'],
		['page', '0'],
		['page', '-1'],
		['page', '1.5'],
		['page', 'abc'],
		['page', '9007199254740992'],
		['page', '1e2'],
		['page', ''],
		['pageSize', '0'],
		['pageSize', '51'],
		['pageSize', '-1'],
		['pageSize', '1.5'],
		['pageSize', 'abc'],
		['pageSize', ''],
		['unknown', 'x'],
	])('rejects invalid %s=%s consistently', async (field, value) => {
		const response = await app.request(`/api/courses?${field}=${value}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field, message: expect.any(String) }] } });
	});
	it('reports multiple invalid fields and repeated parameters', async () => {
		const response = await app.request('/api/courses?page=0&status=bad&tag=ai&tag=web');
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(['page', 'status', 'tag']);
	});
	it('keeps the fixture isolated across requests', async () => {
		const first = await catalog();
		first.items[0]?.tags.push('changed');
		expect((await catalog()).items[0]?.tags).not.toContain('changed');
	});
});
