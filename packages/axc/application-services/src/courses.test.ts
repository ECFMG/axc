import type { Course } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, type CoursePage, type CourseQueryErrorBody, type CourseSearchResult } from './index.ts';

const courses: readonly Course[] = [
	{
		id: 'course-001',
		title: 'AI Security Foundations',
		summary: 'Introductory course on secure AI-assisted development.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'security'],
		createdAt: '2026-01-15T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	},
	{
		id: 'course-002',
		title: 'Cloud Security Lab',
		summary: 'Hands-on lab for cloud hardening.',
		modality: 'online',
		status: 'draft',
		tags: ['security', 'cloud'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-10T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Data Privacy Basics',
		summary: 'Privacy principles for handling personal data.',
		modality: 'in-person',
		status: 'draft',
		tags: ['privacy', 'security'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-05T00:00:00.000Z',
	},
	{
		id: 'course-005',
		title: 'Hybrid AI Workshop',
		summary: 'Build workshop exercises for applied AI teams.',
		modality: 'hybrid',
		status: 'active',
		tags: ['AI', 'workshop'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-04-15T00:00:00.000Z',
	},
	{
		id: 'course-007',
		title: 'Networking Fundamentals',
		summary: 'Routing and switching basics for operators.',
		modality: 'in-person',
		status: 'retired',
		tags: ['networking'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-02T00:00:00.000Z',
	},
	{
		id: 'course-008',
		title: 'Onboarding Pathways',
		summary: 'Covers account security for new hires.',
		modality: 'online',
		status: 'draft',
		tags: ['onboarding'],
		createdAt: '2026-06-01T00:00:00.000Z',
		updatedAt: '2026-06-02T00:00:00.000Z',
	},
	{
		id: 'course-010',
		title: 'Retired Compliance',
		summary: 'Archived overview of audit evidence.',
		modality: 'online',
		status: 'retired',
		tags: ['compliance'],
		createdAt: '2025-11-01T00:00:00.000Z',
		updatedAt: '2026-01-10T00:00:00.000Z',
	},
];

describe('course catalog search', () => {
	it('returns the first page sorted by title with default pagination', async () => {
		const page = ok(await search({}));

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(courses.length);
		expect(page.totalPages).toBe(1);
		expect(page.items.map((course) => course.id)).toEqual(['course-001', 'course-002', 'course-003', 'course-005', 'course-007', 'course-008', 'course-010']);
	});

	it('matches a keyword in title, summary, or tags regardless of case', async () => {
		const page = ok(await search({ q: ['SeCuRiTy'] }));

		expect(page.items.map((course) => course.id)).toEqual(['course-001', 'course-002', 'course-003', 'course-008']);
	});

	it('filters by modality, status, and tag', async () => {
		expect(ids(ok(await search({ modality: ['online'] })))).toEqual(['course-001', 'course-002', 'course-008', 'course-010']);
		expect(ids(ok(await search({ status: ['retired'] })))).toEqual(['course-007', 'course-010']);
		expect(ids(ok(await search({ tag: ['AI'] })))).toEqual(['course-001', 'course-005']);
	});

	it('combines keyword, modality, and status filters', async () => {
		const page = ok(await search({ q: ['security'], modality: ['online'], status: ['active'] }));

		expect(page.items.map((course) => course.id)).toEqual(['course-001']);
	});

	it('paginates after sorting', async () => {
		const page = ok(await searchCatalog(numberedCourses(12), { page: ['2'], pageSize: ['5'], sort: ['title'] }));

		expect(page.page).toBe(2);
		expect(page.pageSize).toBe(5);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(3);
		expect(page.items).toHaveLength(5);
		expect(page.items.map((course) => course.title)).toEqual(['Title 06', 'Title 07', 'Title 08', 'Title 09', 'Title 10']);
	});

	it('uses default page size when only page is provided', async () => {
		const page = ok(await searchCatalog(numberedCourses(12), { page: ['2'] }));

		expect(page.page).toBe(2);
		expect(page.pageSize).toBe(10);
		expect(page.totalPages).toBe(2);
		expect(page.items.map((course) => course.id)).toEqual(['course-011', 'course-012']);
	});

	it('accepts the maximum page size and rejects a larger one', async () => {
		const page = ok(await searchCatalog(numberedCourses(12), { pageSize: ['50'] }));
		expect(page.items).toHaveLength(12);
		expect(page.pageSize).toBe(50);
		expect(page.totalPages).toBe(1);

		expect(invalid(await search({ pageSize: ['51'] })).details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
	});

	it('sorts by createdAt, updatedAt, and title case-insensitively', async () => {
		expect(ids(ok(await search({ sort: ['createdAt'] })))[0]).toBe('course-010');
		expect(ids(ok(await search({ sort: ['updatedAt'] })))[0]).toBe('course-007');
		const titled = ok(await searchCatalog([course({ id: 'course-b', title: 'beta course' }), course({ id: 'course-a', title: 'Alpha course' })], { sort: ['title'] }));
		expect(ids(titled)).toEqual(['course-a', 'course-b']);
	});

	it('returns an empty page when nothing matches', async () => {
		const page = ok(await search({ q: ['zzzz-not-a-course'] }));

		expect(page.items).toEqual([]);
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(0);
		expect(page.totalPages).toBe(0);
	});

	it('does not treat modality or status text as a keyword', async () => {
		expect(ok(await search({ q: ['online'] })).items).toEqual([]);
		expect(ids(ok(await search({ q: ['retired'] })))).toEqual(['course-010']);
	});

	it('returns every invalid query field', async () => {
		const error = invalid(await search({ unknown: ['x'], modality: ['remote'], page: ['0'], pageSize: ['0'], sort: ['rank'] }));

		expect(error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(error.message).toBe('One or more query parameters are invalid.');
		expect(error.details).toEqual([
			{ field: 'unknown', message: 'Unknown query parameter.' },
			{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' },
			{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
			{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
			{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' },
		]);
	});

	it('rejects duplicate, blank, and non-integer query values', async () => {
		expect(invalid(await search({ status: ['published'] })).details).toEqual([{ field: 'status', message: 'status must be one of draft, active, retired.' }]);
		expect(invalid(await search({ page: ['1', '2'] })).details).toEqual([{ field: 'page', message: 'page must be provided once.' }]);
		expect(invalid(await search({ pageSize: ['10.5'] })).details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
		expect(invalid(await search({ sort: ['Title'] })).details).toEqual([{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' }]);
	});

	it('returns a page past the end as an empty item list', async () => {
		const page = ok(await search({ page: ['5'], pageSize: ['2'] }));

		expect(page.items).toEqual([]);
		expect(page.page).toBe(5);
		expect(page.totalItems).toBe(courses.length);
		expect(page.totalPages).toBe(4);
	});
});

function course(overrides: Pick<Course, 'id' | 'title'> & Partial<Omit<Course, 'id' | 'title'>>): Course {
	return {
		id: overrides.id,
		title: overrides.title,
		summary: overrides.summary ?? 'Summary',
		modality: overrides.modality ?? 'online',
		status: overrides.status ?? 'active',
		tags: overrides.tags ?? ['general'],
		createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-01-02T00:00:00.000Z',
	};
}

function numberedCourses(count: number): readonly Course[] {
	return Array.from({ length: count }, (_, index) => {
		const number = index + 1;
		const suffix = String(number).padStart(2, '0');
		return course({
			id: `course-${String(number).padStart(3, '0')}`,
			title: `Title ${suffix}`,
			createdAt: `2026-01-${suffix}T00:00:00.000Z`,
			updatedAt: `2026-02-${suffix}T00:00:00.000Z`,
		});
	});
}

function search(query: Readonly<Record<string, readonly string[]>>): Promise<CourseSearchResult> {
	return searchCatalog(courses, query);
}

async function searchCatalog(catalog: readonly Course[], query: Readonly<Record<string, readonly string[]>>): Promise<CourseSearchResult> {
	const services = await buildApplicationServicesFactory({ environment: 'test' }, { listCourses: () => catalog }).forRequest();
	return services.courses.search(query);
}

function ok(result: CourseSearchResult): CoursePage {
	expect(result.kind).toBe('ok');
	if (result.kind !== 'ok') {
		throw new Error('expected a course page');
	}
	return result.page;
}

function invalid(result: CourseSearchResult): CourseQueryErrorBody {
	expect(result.kind).toBe('invalid');
	if (result.kind !== 'invalid') {
		throw new Error('expected an invalid course query');
	}
	return result.error;
}

function ids(page: CoursePage): string[] {
	return page.items.map((course) => course.id);
}
