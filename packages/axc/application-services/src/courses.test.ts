import { describe, expect, it } from 'vitest';
import { type Course, type CourseQuery, listCourses } from './courses.ts';

const allCourses = (overrides: Partial<CourseQuery> = {}): CoursePageQuery => ({
	page: 1,
	pageSize: 50,
	sort: 'title',
	...overrides,
});

type CoursePageQuery = CourseQuery;

const keyword = 'security';
const hasKeyword = (value: string): boolean => value.toLocaleLowerCase().includes(keyword);

const matchesKeyword = (course: Course): boolean => hasKeyword(course.title) || hasKeyword(course.summary) || course.tags.some(hasKeyword);

const isOrdered = (items: readonly Course[], field: 'title' | 'createdAt' | 'updatedAt'): boolean =>
	items.every((course, index) => {
		const previous = items[index - 1];
		return previous === undefined || previous[field].localeCompare(course[field]) <= 0;
	});

describe('course catalog', () => {
	it('returns the default page of a catalog with at least 12 courses', () => {
		const page = listCourses({ page: 1, pageSize: 10, sort: 'title' });

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.items).toHaveLength(10);
		expect(page.totalItems).toBeGreaterThanOrEqual(12);
		expect(page.totalPages).toBe(Math.ceil(page.totalItems / page.pageSize));
		expect(isOrdered(page.items, 'title')).toBe(true);
	});

	it('matches a keyword in title, summary, or tags regardless of case', () => {
		const page = listCourses(allCourses({ q: 'SeCuRiTy' }));

		expect(page.items.length).toBeGreaterThan(0);
		expect(page.items.every(matchesKeyword)).toBe(true);
		expect(page.items.some((course) => hasKeyword(course.title) && !hasKeyword(course.summary) && !course.tags.some(hasKeyword))).toBe(true);
		expect(page.items.some((course) => !hasKeyword(course.title) && hasKeyword(course.summary) && !course.tags.some(hasKeyword))).toBe(true);
		expect(page.items.some((course) => !hasKeyword(course.title) && !hasKeyword(course.summary) && course.tags.some(hasKeyword))).toBe(true);
	});

	it('filters by modality, status, and tag', () => {
		const online = listCourses(allCourses({ modality: 'online' }));
		const active = listCourses(allCourses({ status: 'active' }));
		const tagged = listCourses(allCourses({ tag: 'AI' }));
		const catalog = listCourses(allCourses());

		expect(online.items.length).toBeGreaterThan(0);
		expect(online.items.every((course) => course.modality === 'online')).toBe(true);
		expect(online.totalItems).toBeLessThan(catalog.totalItems);
		expect(active.items.every((course) => course.status === 'active')).toBe(true);
		expect(active.totalItems).toBeLessThan(catalog.totalItems);
		expect(tagged.items.length).toBeGreaterThan(0);
		expect(tagged.items.every((course) => course.tags.some((tag) => tag.toLocaleLowerCase() === 'ai'))).toBe(true);
		expect(new Set(catalog.items.map((course) => course.modality)).size).toBe(3);
		expect(new Set(catalog.items.map((course) => course.status)).size).toBe(3);
	});

	it('combines keyword, modality, and status', () => {
		const page = listCourses(allCourses({ q: 'security', modality: 'online', status: 'active' }));

		expect(page.items.length).toBeGreaterThan(0);
		expect(page.items.every((course) => matchesKeyword(course) && course.modality === 'online' && course.status === 'active')).toBe(true);
	});

	it('paginates without overlapping items', () => {
		const first = listCourses({ page: 1, pageSize: 5, sort: 'title' });
		const second = listCourses({ page: 2, pageSize: 5, sort: 'title' });
		const firstIds = new Set(first.items.map((course) => course.id));

		expect(first.items).toHaveLength(5);
		expect(second.items).toHaveLength(5);
		expect(first.totalItems).toBe(second.totalItems);
		expect(first.totalPages).toBe(Math.ceil(first.totalItems / 5));
		expect(second.items.every((course) => !firstIds.has(course.id))).toBe(true);
	});

	it('sorts by createdAt and updatedAt', () => {
		const byCreated = listCourses(allCourses({ sort: 'createdAt' }));
		const byUpdated = listCourses(allCourses({ sort: 'updatedAt' }));
		const byTitle = listCourses(allCourses({ sort: 'title' }));

		expect(byCreated.items.length).toBeGreaterThan(1);
		expect(isOrdered(byCreated.items, 'createdAt')).toBe(true);
		expect(isOrdered(byUpdated.items, 'updatedAt')).toBe(true);
		expect(byCreated.items.map((course) => course.id)).not.toEqual(byTitle.items.map((course) => course.id));
	});

	it('returns an empty page when nothing matches', () => {
		const page = listCourses({ page: 1, pageSize: 10, sort: 'title', q: 'zzzz-no-such-course' });

		expect(page.items).toEqual([]);
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(0);
		expect(page.totalPages).toBe(0);
	});
});
