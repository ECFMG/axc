import { buildApplicationServicesFactory } from '@axc/application-services';
import type { Course, CourseSearchResult } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './rest-app.ts';

const courses: Course[] = Array.from({ length: 12 }, (_, index) => ({
	id: `course-${index}`,
	title: index === 0 ? 'AI Security Foundations' : `Course ${String(index).padStart(2, '0')}`,
	summary: index === 1 ? 'Security through practical exercises.' : 'Training course.',
	tags: index < 3 ? ['AI', ...(index === 2 ? ['SECURITY'] : [])] : ['general'],
	modality: index % 3 === 0 ? 'online' : index % 3 === 1 ? 'in-person' : 'hybrid',
	status: index % 3 === 0 ? 'active' : index % 3 === 1 ? 'draft' : 'retired',
	createdAt: `2026-01-${String(12 - index).padStart(2, '0')}T00:00:00.000Z`,
	updatedAt: `2026-06-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
}));
const app = createRestApp(buildApplicationServicesFactory({ environment: 'test', courseCatalog: { list: async () => courses } }));
async function search(query = '') {
	const response = await app.request(`/api/courses${query}`);
	expect(response.status).toBe(200);
	return (await response.json()) as CourseSearchResult;
}

describe('GET /api/courses', () => {
	it('returns the default page and full course contract', async () => {
		const body = await search();
		expect(body).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(body.items).toHaveLength(10);
		expect(body.items[0]).toEqual(courses[0]);
	});
	it('searches title, summary and tags case-insensitively', async () => {
		expect((await search('?q=sEcUrItY')).items.map((course) => course.id)).toEqual(['course-0', 'course-1', 'course-2']);
	});
	it.each(['online', 'in-person', 'hybrid'])('filters modality %s', async (modality) => {
		const body = await search(`?modality=${modality}`);
		expect(body.totalItems).toBe(4);
		expect(body.items.every((course) => course.modality === modality)).toBe(true);
	});
	it.each(['active', 'draft', 'retired'])('filters status %s', async (status) => {
		const body = await search(`?status=${status}`);
		expect(body.totalItems).toBe(4);
		expect(body.items.every((course) => course.status === status)).toBe(true);
	});
	it('matches exact tags case-insensitively', async () => {
		expect((await search('?tag=ai')).totalItems).toBe(3);
		expect((await search('?tag=a')).totalItems).toBe(0);
	});
	it.each(['?q=SECURITY&modality=online&status=active', '?modality=online&status=active&tag=ai'])('intersects combined filters %s', async (query) => {
		const body = await search(query);
		expect(body.totalItems).toBe(1);
		expect(body.items.map((course) => course.id)).toEqual(['course-0']);
	});
	it('paginates after filtering and sorting without overlap', async () => {
		const all = await search('?pageSize=50');
		const first = await search('?pageSize=5');
		const second = await search('?page=2&pageSize=5');
		expect(first).toMatchObject({ page: 1, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect(second).toMatchObject({ page: 2, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect([...first.items, ...second.items]).toEqual(all.items.slice(0, 10));
		const filtered = await search('?tag=ai&page=2&pageSize=2');
		expect(filtered).toMatchObject({ items: [courses[2]], totalItems: 3, totalPages: 2 });
	});
	it.each(['title', 'createdAt', 'updatedAt'] as const)('sorts ascending by %s', async (sort) => {
		const body = await search(`?sort=${sort}&pageSize=50`);
		expect(body.items).toEqual([...courses].sort((a, b) => a[sort].localeCompare(b[sort]) || a.id.localeCompare(b.id)));
	});
	it.each(['?q=no-such-course', '?page=99', '?page=9007199254740991'])('returns an empty page for %s', async (query) => {
		const body = await search(query);
		expect(body.items).toEqual([]);
		expect(body.totalItems).toBe(query.includes('q=') ? 0 : 12);
		expect(body.totalPages).toBe(query.includes('q=') ? 0 : 2);
	});
	it('trims text filters and treats empty text as no filter', async () => {
		expect((await search('?q=%20security%20&tag=%20ai%20')).totalItems).toBe(3);
		expect((await search('?q=&tag=')).totalItems).toBe(12);
	});
	it.each([
		['modality', 'remote'],
		['modality', ''],
		['status', 'ACTIVE'],
		['status', ''],
		['sort', '-title'],
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
		['pageSize', '1.5'],
		['pageSize', ''],
		['pageSize', 'Infinity'],
		['unknown', 'value'],
	])('rejects invalid %s=%s with the consistent error contract', async (field, value) => {
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
	it('reports multiple errors and rejects duplicate query parameters', async () => {
		const response = await app.request('/api/courses?page=0&pageSize=51&tag=ai&tag=web');
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error.details.map((detail: { field: string }) => detail.field)).toEqual(['tag', 'page', 'pageSize']);
	});
});
