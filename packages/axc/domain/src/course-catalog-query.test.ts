import { describe, expect, it } from 'vitest';
import type { Course } from './course.ts';
import { queryCourseCatalog } from './course-catalog-query.ts';
import { type CourseSearchCriteria, DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT_FIELD } from './course-search.ts';

const courses: readonly Course[] = [
	{ id: 'c-1', title: 'Beta Security Basics', summary: 'Foundational material.', modality: 'online', status: 'active', tags: ['security', 'intro'], createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z' },
	{ id: 'c-2', title: 'Alpha Workshop', summary: 'Covers SECURITY reviews in depth.', modality: 'in-person', status: 'draft', tags: ['workshop'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
	{
		id: 'c-3',
		title: 'Delta Operations',
		summary: 'Runbooks and on-call rotations.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['Security', 'ops'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	},
	{ id: 'c-4', title: 'Gamma Design', summary: 'Interface composition.', modality: 'online', status: 'active', tags: ['design'], createdAt: '2026-04-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
];

const criteria = (overrides: Partial<CourseSearchCriteria> = {}): CourseSearchCriteria => ({
	page: DEFAULT_COURSE_PAGE,
	pageSize: DEFAULT_COURSE_PAGE_SIZE,
	sort: DEFAULT_COURSE_SORT_FIELD,
	...overrides,
});

const idsOf = (result: { items: readonly Course[] }) => result.items.map((course) => course.id);

describe('queryCourseCatalog', () => {
	it('returns every course sorted by title with full pagination metadata', () => {
		const result = queryCourseCatalog(courses, criteria());

		expect(idsOf(result)).toStrictEqual(['c-2', 'c-1', 'c-3', 'c-4']);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalItems).toBe(4);
		expect(result.totalPages).toBe(1);
	});

	it('matches the keyword against title, summary, and tags case-insensitively', () => {
		expect(idsOf(queryCourseCatalog(courses, criteria({ keyword: 'security' })))).toStrictEqual(['c-2', 'c-1', 'c-3']);
		expect(idsOf(queryCourseCatalog(courses, criteria({ keyword: 'SeCuRiTy' })))).toStrictEqual(['c-2', 'c-1', 'c-3']);
	});

	it('filters by modality, status, and tag', () => {
		expect(idsOf(queryCourseCatalog(courses, criteria({ modality: 'online' })))).toStrictEqual(['c-1', 'c-4']);
		expect(idsOf(queryCourseCatalog(courses, criteria({ status: 'retired' })))).toStrictEqual(['c-3']);
		expect(idsOf(queryCourseCatalog(courses, criteria({ tag: 'SECURITY' })))).toStrictEqual(['c-1', 'c-3']);
	});

	it('matches a tag exactly rather than by substring', () => {
		expect(idsOf(queryCourseCatalog(courses, criteria({ tag: 'sec' })))).toStrictEqual([]);
	});

	it('combines filters conjunctively', () => {
		const result = queryCourseCatalog(courses, criteria({ keyword: 'security', modality: 'online', status: 'active' }));

		expect(idsOf(result)).toStrictEqual(['c-1']);
		expect(result.totalItems).toBe(1);
	});

	it('sorts ascending by createdAt and updatedAt', () => {
		expect(idsOf(queryCourseCatalog(courses, criteria({ sort: 'createdAt' })))).toStrictEqual(['c-2', 'c-3', 'c-1', 'c-4']);
		expect(idsOf(queryCourseCatalog(courses, criteria({ sort: 'updatedAt' })))).toStrictEqual(['c-3', 'c-1', 'c-2', 'c-4']);
	});

	it('breaks ties on equal sort keys deterministically by title then id', () => {
		const sameDay = '2026-01-01T00:00:00.000Z';
		const tied: readonly Course[] = [
			{ id: 'c-b', title: 'Same Title', summary: '', modality: 'online', status: 'active', tags: [], createdAt: sameDay, updatedAt: sameDay },
			{ id: 'c-a', title: 'Same Title', summary: '', modality: 'online', status: 'active', tags: [], createdAt: sameDay, updatedAt: sameDay },
			{ id: 'c-c', title: 'Another Title', summary: '', modality: 'online', status: 'active', tags: [], createdAt: sameDay, updatedAt: sameDay },
		];

		expect(idsOf(queryCourseCatalog(tied, criteria({ sort: 'createdAt' })))).toStrictEqual(['c-c', 'c-a', 'c-b']);
	});

	it('slices the requested page and reports the page count', () => {
		const first = queryCourseCatalog(courses, criteria({ pageSize: 3 }));
		const second = queryCourseCatalog(courses, criteria({ page: 2, pageSize: 3 }));

		expect(idsOf(first)).toStrictEqual(['c-2', 'c-1', 'c-3']);
		expect(idsOf(second)).toStrictEqual(['c-4']);
		expect(second.totalItems).toBe(4);
		expect(second.totalPages).toBe(2);
	});

	it('returns an empty page beyond the last page rather than failing', () => {
		const result = queryCourseCatalog(courses, criteria({ page: 9, pageSize: 2 }));

		expect(result.items).toStrictEqual([]);
		expect(result.page).toBe(9);
		expect(result.totalItems).toBe(4);
		expect(result.totalPages).toBe(2);
	});

	it('reports zero pages when nothing matches', () => {
		const result = queryCourseCatalog(courses, criteria({ keyword: 'no-such-course' }));

		expect(result.items).toStrictEqual([]);
		expect(result.totalItems).toBe(0);
		expect(result.totalPages).toBe(0);
	});

	it('falls back to lexical ordering when a timestamp is not parseable', () => {
		const malformed: readonly Course[] = [
			{ id: 'c-y', title: 'Y', summary: '', modality: 'online', status: 'active', tags: [], createdAt: 'not-a-date-b', updatedAt: '2026-01-01T00:00:00.000Z' },
			{ id: 'c-x', title: 'X', summary: '', modality: 'online', status: 'active', tags: [], createdAt: 'not-a-date-a', updatedAt: '2026-01-01T00:00:00.000Z' },
		];

		expect(idsOf(queryCourseCatalog(malformed, criteria({ sort: 'createdAt' })))).toStrictEqual(['c-x', 'c-y']);
	});
});
