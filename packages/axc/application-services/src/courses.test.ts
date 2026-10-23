import { describe, expect, it } from 'vitest';
import { type Course, type CourseModality, type CourseSort, type CourseStatus, courseModalities, courseStatuses, courses, listCourses } from './courses.ts';

const contains = (value: string, term: string): boolean => value.toLowerCase().includes(term.toLowerCase());

const keywordHit = (course: Course, term: string): boolean => contains(course.title, term) || contains(course.summary, term) || course.tags.some((tag) => contains(tag, term));

const ordered = (sort: CourseSort): Course[] => [...courses].sort((left, right) => left[sort].localeCompare(right[sort]) || left.id.localeCompare(right.id));

describe('course catalog', () => {
	it('seeds mixed modalities, statuses, and tags', () => {
		expect(courses.length).toBeGreaterThanOrEqual(12);
		expect(new Set(courses.map((course) => course.id)).size).toBe(courses.length);
		expect(new Set(courses.map((course) => course.modality)).size).toBe(courseModalities.length);
		expect(new Set(courses.map((course) => course.status)).size).toBe(courseStatuses.length);
		expect(courses.some((course) => course.tags.length > 1)).toBe(true);
	});

	it('returns the first page sorted by title', () => {
		const page = listCourses({ page: 1, pageSize: 10, sort: 'title' });
		const byTitle = ordered('title');
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(courses.length);
		expect(page.totalPages).toBe(Math.ceil(courses.length / 10));
		expect(page.items.map((course) => course.id)).toEqual(byTitle.slice(0, 10).map((course) => course.id));
	});

	it('matches a keyword in title, summary, or tags regardless of case', () => {
		const securityCourses = courses.filter((course) => keywordHit(course, 'security'));
		const titleOnly = securityCourses.filter((course) => contains(course.title, 'security') && !contains(course.summary, 'security') && !course.tags.some((tag) => contains(tag, 'security')));
		const summaryOnly = securityCourses.filter((course) => !contains(course.title, 'security') && contains(course.summary, 'security') && !course.tags.some((tag) => contains(tag, 'security')));
		const tagOnly = securityCourses.filter((course) => !contains(course.title, 'security') && !contains(course.summary, 'security') && course.tags.some((tag) => contains(tag, 'security')));
		expect(titleOnly.length).toBeGreaterThan(0);
		expect(summaryOnly.length).toBeGreaterThan(0);
		expect(tagOnly.length).toBeGreaterThan(0);

		const found = listCourses({ page: 1, pageSize: 50, sort: 'title', q: 'security' });
		const foundIds = new Set(found.items.map((course) => course.id));
		expect(found.totalItems).toBe(securityCourses.length);
		expect(found.items.every((course) => keywordHit(course, 'security'))).toBe(true);
		for (const course of [...titleOnly, ...summaryOnly, ...tagOnly]) expect(foundIds.has(course.id)).toBe(true);

		const upper = listCourses({ page: 1, pageSize: 50, sort: 'title', q: 'SECURITY' });
		expect(upper.items.map((course) => course.id)).toEqual(found.items.map((course) => course.id));
	});

	it('filters modality, status, and tag case-insensitively', () => {
		for (const modality of courseModalities) {
			const page = listCourses({ page: 1, pageSize: 50, sort: 'title', modality });
			expect(page.items.length).toBeGreaterThan(0);
			expect(page.items.every((course) => course.modality === modality)).toBe(true);
			expect(page.totalItems).toBe(courses.filter((course) => course.modality === modality).length);
		}
		for (const status of courseStatuses) {
			const page = listCourses({ page: 1, pageSize: 50, sort: 'title', status });
			expect(page.items.length).toBeGreaterThan(0);
			expect(page.items.every((course) => course.status === status)).toBe(true);
			expect(page.totalItems).toBe(courses.filter((course) => course.status === status).length);
		}
		const lower = listCourses({ page: 1, pageSize: 50, sort: 'title', tag: 'ai' });
		const upper = listCourses({ page: 1, pageSize: 50, sort: 'title', tag: 'AI' });
		const expected = courses.filter((course) => course.tags.some((tag) => tag.toLowerCase() === 'ai'));
		expect(lower.totalItems).toBeGreaterThan(0);
		expect(lower.items.map((course) => course.id)).toEqual(upper.items.map((course) => course.id));
		expect(lower.totalItems).toBe(expected.length);
		expect(lower.items.every((course) => course.tags.some((tag) => tag.toLowerCase() === 'ai'))).toBe(true);
	});

	it('applies keyword, modality, and status together', () => {
		const modality: CourseModality = 'online';
		const status: CourseStatus = 'active';
		const expected = courses.filter((course) => keywordHit(course, 'security') && course.modality === modality && course.status === status);
		const page = listCourses({ page: 1, pageSize: 10, sort: 'title', q: 'security', modality, status });
		expect(expected.length).toBeGreaterThan(0);
		expect(page.totalItems).toBe(expected.length);
		expect(page.items.every((course) => keywordHit(course, 'security') && course.modality === modality && course.status === status)).toBe(true);

		const emptyExpected = courses.filter((course) => keywordHit(course, 'security') && course.modality === 'in-person' && course.status === 'active');
		const empty = listCourses({ page: 1, pageSize: 10, sort: 'createdAt', q: 'security', modality: 'in-person', status: 'active' });
		expect(emptyExpected).toHaveLength(0);
		expect(empty.items).toEqual([]);
		expect(empty.totalItems).toBe(0);
		expect(empty.totalPages).toBe(0);
	});

	it('paginates and keeps metadata when the page is past the end', () => {
		const byTitle = ordered('title');
		const second = listCourses({ page: 2, pageSize: 5, sort: 'title' });
		expect(second.page).toBe(2);
		expect(second.pageSize).toBe(5);
		expect(second.totalItems).toBe(courses.length);
		expect(second.totalPages).toBe(Math.ceil(courses.length / 5));
		expect(second.items.map((course) => course.id)).toEqual(byTitle.slice(5, 10).map((course) => course.id));
		expect(listCourses({ page: 3, pageSize: 5, sort: 'title' }).items.map((course) => course.id)).toEqual(byTitle.slice(10, 15).map((course) => course.id));
		expect(listCourses({ page: 1, pageSize: 1, sort: 'title' }).items).toHaveLength(1);
		expect(listCourses({ page: 1, pageSize: 50, sort: 'title' }).items).toHaveLength(courses.length);
		expect(listCourses({ page: 1, pageSize: 50, sort: 'title' }).totalPages).toBe(1);

		const past = listCourses({ page: 9, pageSize: 10, sort: 'title' });
		expect(past.items).toEqual([]);
		expect(past.totalItems).toBe(courses.length);
		expect(past.page).toBe(9);
		expect(past.pageSize).toBe(10);
	});

	it('sorts by createdAt and updatedAt', () => {
		expect(listCourses({ page: 1, pageSize: 50, sort: 'createdAt' }).items.map((course) => course.id)).toEqual(ordered('createdAt').map((course) => course.id));
		expect(listCourses({ page: 1, pageSize: 50, sort: 'updatedAt' }).items.map((course) => course.id)).toEqual(ordered('updatedAt').map((course) => course.id));
		expect(ordered('createdAt').map((course) => course.id)).not.toEqual(ordered('title').map((course) => course.id));
	});

	it('returns an empty page when nothing matches', () => {
		const page = listCourses({ page: 1, pageSize: 10, sort: 'title', q: 'zzznomatchqqq' });
		expect(courses.some((course) => keywordHit(course, 'zzznomatchqqq'))).toBe(false);
		expect(page.items).toEqual([]);
		expect(page.totalItems).toBe(0);
		expect(page.totalPages).toBe(0);
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
	});
});
