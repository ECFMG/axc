import { describe, expect, it } from 'vitest';
import { isCourseModality, isCourseSort, isCourseStatus, listCourses } from './courses.ts';

const defaults = { page: 1, pageSize: 10, sort: 'title' } as const;

describe('courses', () => {
	it('returns a paginated list with default page and page size sorted by title', () => {
		const result = listCourses({ ...defaults });
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.items).toHaveLength(10);
		expect(result.totalItems).toBeGreaterThanOrEqual(12);
		expect(result.totalPages).toBe(Math.ceil(result.totalItems / 10));
		const titles = result.items.map((course) => course.title);
		expect(titles).toEqual([...titles].sort((left, right) => left.localeCompare(right)));
	});

	it('matches q case-insensitively across title, summary, and tags', () => {
		const result = listCourses({ ...defaults, pageSize: 50, q: 'SeCuRiTy' });
		expect(result.items.length).toBeGreaterThan(0);
		for (const course of result.items) {
			const haystack = `${course.title} ${course.summary} ${course.tags.join(' ')}`.toLowerCase();
			expect(haystack.includes('security')).toBe(true);
		}
	});

	it('filters by modality, status, and tag', () => {
		const online = listCourses({ ...defaults, pageSize: 50, modality: 'online' });
		expect(online.items.length).toBeGreaterThan(0);
		expect(online.items.every((course) => course.modality === 'online')).toBe(true);

		const active = listCourses({ ...defaults, pageSize: 50, status: 'active' });
		expect(active.items.length).toBeGreaterThan(0);
		expect(active.items.every((course) => course.status === 'active')).toBe(true);

		const tagged = listCourses({ ...defaults, pageSize: 50, tag: 'AI' });
		expect(tagged.items.length).toBeGreaterThan(0);
		expect(tagged.items.every((course) => course.tags.some((tag) => tag.toLowerCase() === 'ai'))).toBe(true);
	});

	it('applies combined q, modality, and status filters', () => {
		const result = listCourses({ ...defaults, pageSize: 50, q: 'security', modality: 'online', status: 'active' });
		expect(result.items.length).toBeGreaterThan(0);
		for (const course of result.items) {
			expect(course.modality).toBe('online');
			expect(course.status).toBe('active');
			const haystack = `${course.title} ${course.summary} ${course.tags.join(' ')}`.toLowerCase();
			expect(haystack.includes('security')).toBe(true);
		}
	});

	it('paginates without overlapping pages', () => {
		const first = listCourses({ page: 1, pageSize: 5, sort: 'title' });
		const second = listCourses({ page: 2, pageSize: 5, sort: 'title' });
		expect(first.items).toHaveLength(5);
		expect(second.items.length).toBeGreaterThan(0);
		expect(first.page).toBe(1);
		expect(first.pageSize).toBe(5);
		const firstIds = new Set(first.items.map((course) => course.id));
		expect(second.items.every((course) => !firstIds.has(course.id))).toBe(true);
	});

	it('sorts by createdAt ascending', () => {
		const result = listCourses({ page: 1, pageSize: 50, sort: 'createdAt' });
		expect(result.items.length).toBeGreaterThan(1);
		expect(
			result.items.every((course, index, items) => {
				const previous = items[index - 1];
				return previous === undefined || previous.createdAt <= course.createdAt;
			}),
		).toBe(true);
	});

	it('returns an empty list with pagination metadata when nothing matches', () => {
		const result = listCourses({ ...defaults, q: 'no-such-course-zzzz' });
		expect(result.items).toEqual([]);
		expect(result.totalItems).toBe(0);
		expect(result.totalPages).toBe(0);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
	});

	it('accepts known enum values and rejects invalid ones', () => {
		expect(isCourseModality('online')).toBe(true);
		expect(isCourseModality('in-person')).toBe(true);
		expect(isCourseModality('hybrid')).toBe(true);
		expect(isCourseModality('postal')).toBe(false);
		expect(isCourseModality('')).toBe(false);
		expect(isCourseStatus('draft')).toBe(true);
		expect(isCourseStatus('active')).toBe(true);
		expect(isCourseStatus('retired')).toBe(true);
		expect(isCourseStatus('gone')).toBe(false);
		expect(isCourseSort('title')).toBe(true);
		expect(isCourseSort('createdAt')).toBe(true);
		expect(isCourseSort('updatedAt')).toBe(true);
		expect(isCourseSort('popularity')).toBe(false);
	});
});
