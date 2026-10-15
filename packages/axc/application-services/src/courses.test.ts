import type { Course } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { type CourseQueryValues, type CourseSearchOutcome, searchCourses } from './courses.ts';
import { buildApplicationServicesFactory } from './index.ts';

const fixture = [
	{
		id: 'c-title',
		title: 'Security Basics',
		summary: 'Plain overview',
		modality: 'online',
		status: 'active',
		tags: ['intro'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
	{
		id: 'c-summary',
		title: 'Operations',
		summary: 'Covers SECURITY drills',
		modality: 'in-person',
		status: 'draft',
		tags: ['ops'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	},
	{
		id: 'c-tag',
		title: 'Design Lab',
		summary: 'Visual systems',
		modality: 'hybrid',
		status: 'retired',
		tags: ['AI', 'Security'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-02T00:00:00.000Z',
	},
	{
		id: 'c-alpha',
		title: 'Alpha Course',
		summary: 'First by title',
		modality: 'online',
		status: 'active',
		tags: ['ai'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-06-02T00:00:00.000Z',
	},
	{
		id: 'c-zeta',
		title: 'Zeta Course',
		summary: 'Last by title',
		modality: 'hybrid',
		status: 'active',
		tags: ['zeta'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-01-15T00:00:00.000Z',
	},
	{
		id: 'c-middle',
		title: 'Middle Course',
		summary: 'Between',
		modality: 'in-person',
		status: 'retired',
		tags: ['middle'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-03-01T00:00:00.000Z',
	},
] as const satisfies readonly Course[];

describe('course catalog search', () => {
	it('returns the default page sorted by title', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }, { listCourses: () => fixture }).forRequest();
		const page = expectPage(services.courses.search({}));

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(6);
		expect(page.totalPages).toBe(1);
		expect(page.items.map((course) => course.id)).toEqual(['c-alpha', 'c-tag', 'c-middle', 'c-summary', 'c-title', 'c-zeta']);
		expect(page.items[0]).toEqual(fixture[3]);
	});

	it('matches q across title, summary, and tags without case', () => {
		expect(ids(searchCourses(fixture, values({ q: 'SeCuRiTy' })))).toEqual(['c-tag', 'c-summary', 'c-title']);
		expect(ids(searchCourses(fixture, values({ q: 'security' })))).toEqual(['c-tag', 'c-summary', 'c-title']);
	});

	it('filters by modality, status, and tag', () => {
		expect(ids(searchCourses(fixture, values({ modality: 'online' })))).toEqual(['c-alpha', 'c-title']);
		expect(ids(searchCourses(fixture, values({ status: 'active' })))).toEqual(['c-alpha', 'c-title', 'c-zeta']);
		expect(ids(searchCourses(fixture, values({ status: 'draft' })))).toEqual(['c-summary']);
		expect(ids(searchCourses(fixture, values({ tag: 'AI' })))).toEqual(['c-alpha', 'c-tag']);
	});

	it('combines keyword, modality, and status', () => {
		expect(ids(searchCourses(fixture, values({ q: 'security', modality: 'online', status: 'active' })))).toEqual(['c-title']);
	});

	it('paginates after sorting', () => {
		expect(ids(searchCourses(fixture, values({ page: '1', pageSize: '2' })))).toEqual(['c-alpha', 'c-tag']);
		expect(ids(searchCourses(fixture, values({ page: '2', pageSize: '2' })))).toEqual(['c-middle', 'c-summary']);
		const pastEnd = expectPage(searchCourses(fixture, values({ page: '4', pageSize: '2' })));
		expect(pastEnd.items).toEqual([]);
		expect(pastEnd.page).toBe(4);
		expect(pastEnd.totalItems).toBe(6);
		expect(pastEnd.totalPages).toBe(3);
	});

	it('sorts by createdAt and updatedAt', () => {
		expect(ids(searchCourses(fixture, values({ sort: 'title' })))[0]).toBe('c-alpha');
		expect(ids(searchCourses(fixture, values({ sort: 'createdAt' })))).toEqual(['c-summary', 'c-tag', 'c-title', 'c-zeta', 'c-middle', 'c-alpha']);
		expect(ids(searchCourses(fixture, values({ sort: 'updatedAt' })))[0]).toBe('c-zeta');
	});

	it('returns an empty page when nothing matches', () => {
		const page = expectPage(searchCourses(fixture, values({ q: 'missing' })));
		expect(page.items).toEqual([]);
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(0);
		expect(page.totalPages).toBe(0);
	});

	it.each([
		['modality', 'remote', 'modality must be online, in-person, or hybrid.'],
		['status', 'published', 'status must be draft, active, or retired.'],
		['page', '0', 'page must be an integer greater than or equal to 1.'],
		['page', '1.5', 'page must be an integer greater than or equal to 1.'],
		['pageSize', '51', 'pageSize must be between 1 and 50.'],
		['pageSize', '0', 'pageSize must be between 1 and 50.'],
		['sort', 'name', 'sort must be title, createdAt, or updatedAt.'],
	])('rejects invalid %s', (field, value, message) => {
		expect(searchCourses(fixture, { [field]: [value] })).toEqual(invalid([{ field, message }]));
	});

	it('rejects empty, duplicate, and unknown query parameters together', () => {
		expect(searchCourses(fixture, { q: ['  '], page: ['1', '2'], extra: ['1'], modality: ['nope'], pageSize: ['0'] })).toEqual(
			invalid([
				{ field: 'extra', message: 'extra is not a supported query parameter.' },
				{ field: 'q', message: 'q must not be empty.' },
				{ field: 'modality', message: 'modality must be online, in-person, or hybrid.' },
				{ field: 'page', message: 'page must be provided once.' },
				{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
			]),
		);
	});

	it('accepts the pageSize bounds', () => {
		expect('error' in searchCourses(fixture, values({ page: '1', pageSize: '1', sort: 'title' }))).toBe(false);
		expect('error' in searchCourses(fixture, values({ pageSize: '50' }))).toBe(false);
	});
});

function values(params: Record<string, string>): CourseQueryValues {
	return Object.fromEntries(Object.entries(params).map(([field, value]) => [field, [value]]));
}

function ids(outcome: CourseSearchOutcome): string[] {
	return expectPage(outcome).items.map((course) => course.id);
}

function expectPage(outcome: CourseSearchOutcome): Extract<CourseSearchOutcome, { items: Course[] }> {
	if ('error' in outcome) {
		throw new Error('expected a course page');
	}
	return outcome;
}

function invalid(details: { field: string; message: string }[]): CourseSearchOutcome {
	return {
		error: {
			code: 'INVALID_QUERY_PARAMETER',
			message: 'One or more query parameters are invalid.',
			details,
		},
	};
}
