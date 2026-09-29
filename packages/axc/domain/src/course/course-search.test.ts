import { describe, expect, it } from 'vitest';
import type { Course } from './course.ts';
import { type CourseSearchCriteria, DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT_FIELD, searchCourses } from './course-search.ts';

const catalog: readonly Course[] = [
	{ id: 'c-3', title: 'Threat Modeling', summary: 'Prioritise SECURITY controls.', modality: 'online', status: 'active', tags: ['Threats'], createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-03-02T00:00:00.000Z' },
	{
		id: 'c-1',
		title: 'AI Security Foundations',
		summary: 'Secure AI-assisted development.',
		modality: 'online',
		status: 'active',
		tags: ['AI', 'security'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	},
	{
		id: 'c-2',
		title: 'Legacy Modernization',
		summary: 'Replace monoliths incrementally.',
		modality: 'in-person',
		status: 'retired',
		tags: ['architecture'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-02T00:00:00.000Z',
	},
	{ id: 'c-4', title: 'Prompt Engineering', summary: 'Shared prompting practices.', modality: 'hybrid', status: 'draft', tags: ['ai'], createdAt: '2026-04-01T00:00:00.000Z', updatedAt: '2026-01-15T00:00:00.000Z' },
];

const baseCriteria: CourseSearchCriteria = {
	page: DEFAULT_COURSE_PAGE,
	pageSize: DEFAULT_COURSE_PAGE_SIZE,
	sort: DEFAULT_COURSE_SORT_FIELD,
};

const idsFor = (criteria: Partial<CourseSearchCriteria>) => searchCourses(catalog, { ...baseCriteria, ...criteria }).items.map((course) => course.id);

describe('searchCourses', () => {
	it('returns every course ordered by title by default', () => {
		const page = searchCourses(catalog, baseCriteria);

		expect(page.items.map((course) => course.id)).toStrictEqual(['c-1', 'c-2', 'c-4', 'c-3']);
		expect(page).toMatchObject({ page: 1, pageSize: 10, totalItems: 4, totalPages: 1 });
	});

	it('matches the keyword against the title regardless of case', () => {
		expect(idsFor({ keyword: 'LEGACY' })).toStrictEqual(['c-2']);
	});

	it('matches the keyword against the summary regardless of case', () => {
		expect(idsFor({ keyword: 'monoliths' })).toStrictEqual(['c-2']);
	});

	it('matches the keyword against tags regardless of case', () => {
		expect(idsFor({ keyword: 'ai' })).toStrictEqual(['c-1', 'c-4']);
	});

	it('matches the keyword across title, summary, and tags at once', () => {
		expect(idsFor({ keyword: 'security' })).toStrictEqual(['c-1', 'c-3']);
	});

	it('filters by modality', () => {
		expect(idsFor({ modality: 'online' })).toStrictEqual(['c-1', 'c-3']);
	});

	it('filters by status', () => {
		expect(idsFor({ status: 'draft' })).toStrictEqual(['c-4']);
	});

	it('filters by exact tag, ignoring case', () => {
		expect(idsFor({ tag: 'AI' })).toStrictEqual(['c-1', 'c-4']);
	});

	it('does not treat a tag filter as a substring match', () => {
		expect(idsFor({ tag: 'threat' })).toStrictEqual([]);
	});

	it('combines keyword, modality, and status filters', () => {
		expect(idsFor({ keyword: 'security', modality: 'online', status: 'active' })).toStrictEqual(['c-1', 'c-3']);
	});

	it('sorts by createdAt ascending', () => {
		expect(idsFor({ sort: 'createdAt' })).toStrictEqual(['c-1', 'c-2', 'c-3', 'c-4']);
	});

	it('sorts by updatedAt ascending', () => {
		expect(idsFor({ sort: 'updatedAt' })).toStrictEqual(['c-4', 'c-2', 'c-3', 'c-1']);
	});

	it('paginates and reports the total page count', () => {
		const page = searchCourses(catalog, { ...baseCriteria, page: 2, pageSize: 3 });

		expect(page.items.map((course) => course.id)).toStrictEqual(['c-3']);
		expect(page).toMatchObject({ page: 2, pageSize: 3, totalItems: 4, totalPages: 2 });
	});

	it('returns an empty page past the last page', () => {
		const page = searchCourses(catalog, { ...baseCriteria, page: 9, pageSize: 3 });

		expect(page.items).toStrictEqual([]);
		expect(page).toMatchObject({ page: 9, pageSize: 3, totalItems: 4, totalPages: 2 });
	});

	it('returns an empty page when nothing matches', () => {
		const page = searchCourses(catalog, { ...baseCriteria, keyword: 'no-such-course' });

		expect(page.items).toStrictEqual([]);
		expect(page).toMatchObject({ page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('leaves the source collection untouched', () => {
		searchCourses(catalog, { ...baseCriteria, sort: 'createdAt' });

		expect(catalog.map((course) => course.id)).toStrictEqual(['c-3', 'c-1', 'c-2', 'c-4']);
	});
});
