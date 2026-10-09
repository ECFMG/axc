import { buildApplicationServicesFactory } from '@axc/application-services';
import type { CoursePage } from '@axc/domain';
import { createCourseRepository } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const repository = createCourseRepository();
const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }, repository));
async function search(query = '') {
	const response = await app.request(`/api/courses${query ? `?${query}` : ''}`);
	expect(response.status).toBe(200);
	return (await response.json()) as CoursePage;
}

describe('course catalog HTTP contract', () => {
	it('returns default pagination and complete course records', async () => {
		const result = await search();
		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(result.items).toHaveLength(10);
		expect(result.items[0]).toEqual(await repository.get('course-001'));
		const courses = await repository.list();
		expect(new Set(courses.map((course) => course.id)).size).toBe(12);
		expect(new Set(courses.map((course) => course.modality)).size).toBe(3);
		expect(new Set(courses.map((course) => course.status)).size).toBe(3);
	});
	it.each([
		['AI%20SECURITY', ['course-001']],
		['SECURITY', ['course-001', 'course-008', 'course-009', 'course-012']],
		['RESILIENT', ['course-002']],
		['ACCESSIBILITY', ['course-005']],
	])('searches title, summary and tags case-insensitively: %s', async (q, ids) => {
		expect((await search(`q=${q}`)).items.map((course) => course.id)).toEqual(ids);
	});
	it.each(['online', 'in-person', 'hybrid'])('filters modality %s', async (modality) => {
		const result = await search(`modality=${modality}`);
		expect(result.totalItems).toBeGreaterThan(0);
		expect(result.items.every((course) => course.modality === modality)).toBe(true);
	});
	it.each(['draft', 'active', 'retired'])('filters status %s', async (status) => {
		const result = await search(`status=${status}`);
		expect(result.totalItems).toBeGreaterThan(0);
		expect(result.items.every((course) => course.status === status)).toBe(true);
	});
	it('matches tags exactly regardless of case', async () => {
		expect((await search('tag=AI')).items.map((course) => course.id)).toEqual(['course-001', 'course-007']);
		expect((await search('tag=secur')).totalItems).toBe(0);
	});
	it.each([
		['q=SECURITY&modality=online&status=active', ['course-001']],
		['modality=hybrid&status=active&tag=SECURITY', ['course-009']],
	])('combines all requested filters: %s', async (query, ids) => {
		expect((await search(query)).items.map((course) => course.id)).toEqual(ids);
	});
	it('paginates after filtering and sorting', async () => {
		const full = await search('pageSize=50');
		const second = await search('page=2&pageSize=5');
		expect(second).toMatchObject({ page: 2, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect(second.items).toEqual(full.items.slice(5, 10));
		expect((await search('page=3&pageSize=5')).items).toHaveLength(2);
		expect((await search('page=4&pageSize=5')).items).toEqual([]);
		expect(await search('status=active&page=2&pageSize=2')).toMatchObject({ totalItems: 6, totalPages: 3 });
	});
	it.each(['title', 'createdAt', 'updatedAt'] as const)('sorts ascending by %s', async (sort) => {
		const { items } = await search(`sort=${sort}&pageSize=50`);
		const values = items.map((course) => course[sort]);
		expect(values).toEqual([...values].sort((a, b) => a.localeCompare(b)));
	});
	it('returns empty pagination metadata for no matches', async () => {
		expect(await search('q=no-such-course&page=2&pageSize=5')).toEqual({ items: [], page: 2, pageSize: 5, totalItems: 0, totalPages: 0 });
	});
	it('treats blank search text as no filter and trims search text', async () => {
		expect((await search('q=%20&tag=')).totalItems).toBe(12);
		expect((await search('q=%20security%20&tag=%20AI%20')).totalItems).toBe(1);
	});
	it.each([
		['modality=remote', 'modality'],
		['modality=', 'modality'],
		['status=published', 'status'],
		['page=0', 'page'],
		['page=-1', 'page'],
		['page=1.5', 'page'],
		['page=abc', 'page'],
		['page=', 'page'],
		['page=9007199254740992', 'page'],
		['page=1e2', 'page'],
		['pageSize=0', 'pageSize'],
		['pageSize=51', 'pageSize'],
		['pageSize=2.5', 'pageSize'],
		['pageSize=10x', 'pageSize'],
		['pageSize=', 'pageSize'],
		['sort=summary', 'sort'],
		['sort=', 'sort'],
		['unknown=value', 'unknown'],
		['page=1&page=2', 'page'],
		['q=a&q=b', 'q'],
	])('rejects invalid query %s consistently', async (query, field) => {
		const response = await app.request(`/api/courses?${query}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: expect.arrayContaining([{ field, message: expect.any(String) }]),
			},
		});
	});
	it('reports multiple invalid fields together', async () => {
		const response = await app.request('/api/courses?modality=bad&pageSize=51');
		const body = await response.json();
		expect(body.error.details.map((detail: { field: string }) => detail.field)).toEqual(['modality', 'pageSize']);
	});
	it('preserves the health endpoint', async () => {
		const response = await app.request('/health');
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ status: 'ok', environment: 'test' });
	});
});
