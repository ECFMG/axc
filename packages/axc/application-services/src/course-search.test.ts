import { describe, expect, it } from 'vitest';
import { searchCourses } from './course-search.ts';
import type { CoursePage } from './course-types.ts';

function page(query = ''): CoursePage {
	const result = searchCourses(new URLSearchParams(query));
	if (result.status !== 200) throw new Error(JSON.stringify(result.body));
	return result.body;
}

const ids = (result: CoursePage) => result.items.map((course) => course.id);

describe('course catalog', () => {
	it('returns twelve complete, varied fixtures with default pagination', () => {
		const result = page();
		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(result.items).toHaveLength(10);
		const all = page('pageSize=50').items;
		expect(new Set(all.map((course) => course.id)).size).toBe(12);
		expect(new Set(all.map((course) => course.modality)).size).toBe(3);
		expect(new Set(all.map((course) => course.status)).size).toBe(3);
		for (const course of all) {
			for (const field of ['id', 'title', 'summary'] as const) expect(course[field].length).toBeGreaterThan(0);
			expect(course.tags.length).toBeGreaterThan(0);
			expect(new Date(course.createdAt).toISOString()).toBe(course.createdAt);
			expect(new Date(course.updatedAt).toISOString()).toBe(course.updatedAt);
		}
	});

	it.each([
		['q=AI%20SECURITY%20FOUNDATIONS', ['course-001']],
		['q=PREDICTIVE', ['course-004']],
		['q=ETHICS', ['course-010']],
		['q=SeCuRiTy', ['course-001', 'course-005']],
	])('searches title, summary and tags without case sensitivity: %s', (query, expected) => {
		expect(ids(page(query))).toEqual(expected);
	});

	it.each(['online', 'in-person', 'hybrid'])('filters modality %s', (modality) => {
		const result = page(`modality=${modality}`);
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.modality === modality)).toBe(true);
	});
	it.each(['draft', 'active', 'retired'])('filters status %s', (status) => {
		const result = page(`status=${status}`);
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.status === status)).toBe(true);
	});
	it('matches whole tags case-insensitively', () => {
		expect(ids(page('tag=AI'))).toEqual(['course-001', 'course-004', 'course-010']);
		expect(page('tag=secur').items).toEqual([]);
	});
	it.each([
		['q=security&modality=online&status=active', ['course-001', 'course-005']],
		['modality=hybrid&status=draft&tag=AI', ['course-004', 'course-010']],
		['q=security&modality=in-person&status=active', []],
	])('combines filters using AND: %s', (query, expected) => expect(ids(page(query))).toEqual(expected));

	it('paginates after filtering and sorting without gaps or duplicates', () => {
		const all = ids(page('pageSize=50&sort=updatedAt'));
		const pages = [1, 2, 3].map((n) => page(`page=${n}&pageSize=5&sort=updatedAt`));
		expect(pages.map((result) => result.items.length)).toEqual([5, 5, 2]);
		expect(pages.flatMap(ids)).toEqual(all);
		expect(pages.every((result) => result.totalItems === 12 && result.totalPages === 3)).toBe(true);
		expect(page('modality=online&pageSize=2&page=2')).toMatchObject({ page: 2, pageSize: 2, totalItems: 5, totalPages: 3 });
		expect(page('pageSize=1').items).toHaveLength(1);
		expect(page('pageSize=50').items).toHaveLength(12);
		expect(page('page=9007199254740991').items).toEqual([]);
	});
	it.each(['title', 'createdAt', 'updatedAt'] as const)('sorts %s ascending', (sort) => {
		const values = page(`sort=${sort}&pageSize=50`).items.map((course) => course[sort].toLowerCase());
		expect(values).toEqual([...values].sort());
	});
	it.each([
		'modality=remote',
		'modality=',
		'status=unknown',
		'status=',
		'sort=unknown',
		'sort=',
		'page=0',
		'page=-1',
		'page=1.5',
		'page=bad',
		'page=',
		'page=%201',
		'page=1e2',
		'page=0x10',
		'page=Infinity',
		'page=9007199254740992',
		'pageSize=0',
		'pageSize=-1',
		'pageSize=51',
		'pageSize=bad',
		'pageSize=1.5',
		'pageSize=',
		'page=1&page=2',
		'q=ai&q=security',
		'unknown=value',
	])('rejects invalid raw query: %s', (query) => {
		const result = searchCourses(new URLSearchParams(query));
		expect(result.status).toBe(400);
		if (result.status !== 400) throw new Error('Expected validation error');
		expect(result.body.error).toMatchObject({ code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.' });
		expect(result.body.error.details).toContainEqual({ field: query.split('=')[0], message: expect.any(String) });
	});
	it('reports multiple validation failures together', () => {
		const result = searchCourses(new URLSearchParams('page=0&pageSize=51&status=bad'));
		if (result.status !== 400) throw new Error('Expected validation error');
		expect(result.body.error.details.map((detail) => detail.field).sort()).toEqual(['page', 'pageSize', 'status']);
		expect(result.body.error.details).toContainEqual({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
	});
	it('returns empty success for no matches or an out-of-range page', () => {
		expect(page('q=__missing__')).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		expect(page('page=99')).toMatchObject({ items: [], totalItems: 12, totalPages: 2 });
	});
	it('trims search terms and treats blank keyword and tag as absent', () => {
		expect(ids(page('q=%20SECURITY%20'))).toEqual(ids(page('q=security')));
		expect(ids(page('tag=%20AI%20'))).toEqual(ids(page('tag=ai')));
		expect(page('q=%20&tag=')).toEqual(page());
	});
	it('keeps later requests independent of caller mutation', () => {
		const result = page();
		Object.assign(result.items[0] ?? {}, { title: 'Changed', tags: ['changed'] });
		result.items.reverse();
		expect(page().items.some((course) => course.title === 'Changed')).toBe(false);
		expect(page().items.some((course) => course.tags.includes('changed'))).toBe(false);
	});
});
