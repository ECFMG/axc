import { describe, expect, it } from 'vitest';
import type { Course } from './course.ts';
import { matchesCourseSearchCriteria, searchCourses } from './course-search.ts';
import type { CourseSearchCriteria } from './course-search-criteria.ts';
import { DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT_FIELD } from './course-search-criteria.ts';

const course = (overrides: Partial<Course> & Pick<Course, 'id'>): Course => ({
	title: 'Untitled',
	summary: 'No summary.',
	modality: 'online',
	status: 'active',
	tags: [],
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	...overrides,
});

const criteria = (overrides: Partial<CourseSearchCriteria> = {}): CourseSearchCriteria => ({
	keyword: undefined,
	modality: undefined,
	status: undefined,
	tag: undefined,
	page: DEFAULT_COURSE_PAGE,
	pageSize: DEFAULT_COURSE_PAGE_SIZE,
	sort: DEFAULT_COURSE_SORT_FIELD,
	...overrides,
});

describe('matchesCourseSearchCriteria', () => {
	it('matches a keyword found in the title', () => {
		expect(matchesCourseSearchCriteria(course({ id: 'a', title: 'AI Security Foundations' }), criteria({ keyword: 'security' }))).toBe(true);
	});

	it('matches a keyword found in the summary', () => {
		expect(matchesCourseSearchCriteria(course({ id: 'a', summary: 'Hardening the SECURITY posture of a team.' }), criteria({ keyword: 'security' }))).toBe(true);
	});

	it('matches a keyword found in a tag', () => {
		expect(matchesCourseSearchCriteria(course({ id: 'a', tags: ['Security'] }), criteria({ keyword: 'security' }))).toBe(true);
	});

	it('does not match a keyword absent from every searchable field', () => {
		expect(matchesCourseSearchCriteria(course({ id: 'a', title: 'Kubernetes Basics' }), criteria({ keyword: 'security' }))).toBe(false);
	});

	it('matches a tag regardless of case', () => {
		expect(matchesCourseSearchCriteria(course({ id: 'a', tags: ['AI'] }), criteria({ tag: 'ai' }))).toBe(true);
	});

	it('requires an exact tag, not a prefix', () => {
		expect(matchesCourseSearchCriteria(course({ id: 'a', tags: ['airflow'] }), criteria({ tag: 'ai' }))).toBe(false);
	});

	it('applies modality and status filters together', () => {
		const hybridDraft = course({ id: 'a', modality: 'hybrid', status: 'draft' });

		expect(matchesCourseSearchCriteria(hybridDraft, criteria({ modality: 'hybrid', status: 'draft' }))).toBe(true);
		expect(matchesCourseSearchCriteria(hybridDraft, criteria({ modality: 'hybrid', status: 'active' }))).toBe(false);
	});
});

describe('searchCourses', () => {
	const catalog: readonly Course[] = [
		course({ id: 'c', title: 'Charlie', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z' }),
		course({ id: 'a', title: 'alpha', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' }),
		course({ id: 'b', title: 'Bravo', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z' }),
	];

	it('sorts by title case-insensitively by default', () => {
		expect(searchCourses(catalog, criteria()).items.map((item) => item.id)).toStrictEqual(['a', 'b', 'c']);
	});

	it('sorts by createdAt ascending', () => {
		expect(searchCourses(catalog, criteria({ sort: 'createdAt' })).items.map((item) => item.id)).toStrictEqual(['a', 'b', 'c']);
	});

	it('sorts by updatedAt ascending', () => {
		expect(searchCourses(catalog, criteria({ sort: 'updatedAt' })).items.map((item) => item.id)).toStrictEqual(['c', 'b', 'a']);
	});

	it('pages through results and reports pagination metadata', () => {
		const firstPage = searchCourses(catalog, criteria({ page: 1, pageSize: 2 }));
		const secondPage = searchCourses(catalog, criteria({ page: 2, pageSize: 2 }));

		expect(firstPage).toStrictEqual({ items: [catalog[1], catalog[2]], page: 1, pageSize: 2, totalItems: 3, totalPages: 2 });
		expect(secondPage.items.map((item) => item.id)).toStrictEqual(['c']);
		expect(secondPage.totalPages).toBe(2);
	});

	it('returns an empty page past the end of the result set', () => {
		const result = searchCourses(catalog, criteria({ page: 9, pageSize: 2 }));

		expect(result.items).toStrictEqual([]);
		expect(result.totalItems).toBe(3);
	});

	it('returns an empty result rather than failing when nothing matches', () => {
		const result = searchCourses(catalog, criteria({ keyword: 'nothing-matches-this' }));

		expect(result).toStrictEqual({ items: [], page: 1, pageSize: DEFAULT_COURSE_PAGE_SIZE, totalItems: 0, totalPages: 0 });
	});

	it('does not mutate the source collection', () => {
		const source = [...catalog];
		searchCourses(source, criteria());

		expect(source.map((item) => item.id)).toStrictEqual(['c', 'a', 'b']);
	});
});
