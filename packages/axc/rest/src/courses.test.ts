import { buildApplicationServicesFactory, type CourseSearchResult } from '@axc/application-services';
import type { Course } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const courses: Course[] = Array.from({ length: 12 }, (_, i) => ({
	id: `course-${i + 1}`,
	title: i === 0 ? 'Security Foundations' : `Training ${String(i + 1).padStart(2, '0')}`,
	summary: i === 1 ? 'Practical SECURITY controls.' : 'Learn useful skills.',
	modality: i % 3 === 0 ? 'online' : i % 3 === 1 ? 'in-person' : 'hybrid',
	status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'draft' : 'retired',
	tags: i === 2 ? ['Security', 'AI'] : i === 0 ? ['ai'] : ['teams'],
	createdAt: `2026-01-${String(12 - i).padStart(2, '0')}T00:00:00.000Z`,
	updatedAt: `2026-06-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
}));
const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }, { list: () => Promise.resolve(courses) }));

async function search(query = ''): Promise<CourseSearchResult> {
	const response = await app.request(`/api/courses${query}`);
	expect(response.status).toBe(200);
	return response.json();
}

describe('GET /api/courses', () => {
	it('returns the default sorted page and complete course fields', async () => {
		const result = await search();
		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(result.items).toEqual(courses.slice(0, 10));
	});
	it('matches keywords across title, summary and tags regardless of case', async () => {
		expect((await search('?q=sEcUrItY')).items.map((c) => c.id)).toEqual(['course-1', 'course-2', 'course-3']);
	});
	it.each(['online', 'in-person', 'hybrid'] as const)('filters modality %s', async (modality) => {
		expect((await search(`?modality=${modality}`)).items).toEqual(courses.filter((c) => c.modality === modality));
	});
	it.each(['active', 'draft', 'retired'] as const)('filters status %s', async (status) => {
		expect((await search(`?status=${status}`)).items).toEqual(courses.filter((c) => c.status === status));
	});
	it('matches an exact tag case-insensitively', async () => {
		expect((await search('?tag=aI')).items.map((c) => c.id)).toEqual(['course-1', 'course-3']);
		expect((await search('?tag=sec')).items).toEqual([]);
	});
	it('combines keyword, modality and status', async () => {
		expect((await search('?q=security&modality=online&status=active')).items.map((c) => c.id)).toEqual(['course-1']);
	});
	it('combines tag and status and trims search terms', async () => {
		expect((await search('?tag=%20AI%20&status=retired&q=%20SECURITY%20')).items.map((c) => c.id)).toEqual(['course-3']);
	});
	it('paginates after filtering and preserves totals', async () => {
		expect(await search('?q=security&page=2&pageSize=2')).toEqual({ items: [courses[2]], page: 2, pageSize: 2, totalItems: 3, totalPages: 2 });
		expect((await search('?page=3&pageSize=5')).items).toEqual(courses.slice(10));
		expect(await search('?page=4&pageSize=5')).toMatchObject({ items: [], page: 4, totalItems: 12, totalPages: 3 });
		expect((await search('?pageSize=50')).items).toHaveLength(12);
	});
	it.each(['title', 'createdAt', 'updatedAt'] as const)('sorts ascending by %s', async (sort) => {
		const expected = [...courses].sort((a, b) => a[sort].localeCompare(b[sort], 'en'));
		expect((await search(`?sort=${sort}&pageSize=50`)).items).toEqual(expected);
	});
	it('returns an empty page with zero totals for no matches', async () => {
		expect(await search('?q=nonexistent')).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
	it('treats empty search terms as no filter', async () => {
		expect(await search('?q=&tag=')).toEqual(await search());
	});
	it.each([
		['modality', 'remote'],
		['modality', ''],
		['status', 'published'],
		['status', 'ACTIVE'],
		['sort', 'id'],
		['sort', ''],
		['page', '0'],
		['page', '-1'],
		['page', '1.5'],
		['page', 'abc'],
		['page', ''],
		['page', '1e2'],
		['page', '9007199254740992'],
		['pageSize', '0'],
		['pageSize', '51'],
		['pageSize', '-1'],
		['pageSize', '2.5'],
		['pageSize', 'abc'],
		['pageSize', ''],
		['pageSize', 'Infinity'],
		['unknown', 'value'],
	])('rejects invalid %s=%s with a consistent error', async (field, value) => {
		const response = await app.request(`/api/courses?${field}=${value}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [{ field, message: expect.any(String) }],
			},
		});
	});
	it('reports multiple failures and rejects duplicate parameters', async () => {
		const response = await app.request('/api/courses?modality=bad&page=0&pageSize=51&tag=ai&tag=security');
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error.details.map((detail: { field: string }) => detail.field)).toEqual(['tag', 'modality', 'page', 'pageSize']);
	});
	it('preserves the health endpoint', async () => {
		const response = await app.request('/health');
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ status: 'ok', environment: 'test' });
	});
});
