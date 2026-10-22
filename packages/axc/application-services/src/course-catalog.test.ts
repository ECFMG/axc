import { describe, expect, it } from 'vitest';
import { type CourseSearchQuery, type CourseSearchResult, searchCourses } from './course-catalog.ts';
import { buildApplicationServicesFactory } from './index.ts';

type CoursePage = Extract<CourseSearchResult, { ok: true }>['body'];

const DEFAULT_IDS = ['course-005', 'course-006', 'course-001', 'course-013', 'course-009', 'course-003', 'course-007', 'course-014', 'course-010', 'course-011'];
const CREATED_AT_IDS = ['course-013', 'course-009', 'course-004', 'course-001', 'course-007', 'course-002', 'course-010', 'course-003', 'course-011', 'course-005', 'course-014', 'course-006', 'course-008', 'course-012'];
const UPDATED_AT_IDS = ['course-013', 'course-009', 'course-004', 'course-002', 'course-003', 'course-011', 'course-005', 'course-014', 'course-006', 'course-001', 'course-008', 'course-007', 'course-012', 'course-010'];

describe('course catalog search', () => {
	it('returns the default page sorted by title', () => {
		const page = expectPage({});

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(14);
		expect(page.totalPages).toBe(2);
		expect(ids(page)).toEqual(DEFAULT_IDS);
		expect(page.items[0]).toMatchObject({
			id: 'course-005',
			title: 'Accessibility Essentials',
			modality: 'online',
			status: 'active',
			tags: ['a11y', 'frontend'],
		});
	});

	it('seeds at least 12 courses with mixed modality, status, and tags', () => {
		const page = expectPage({ pageSize: '50' });
		const modalities = new Set(page.items.map((course) => course.modality));
		const statuses = new Set(page.items.map((course) => course.status));
		const tags = new Set(page.items.flatMap((course) => course.tags.map((tag) => tag.toLocaleLowerCase('en-US'))));

		expect(page.totalItems).toBeGreaterThanOrEqual(12);
		expect(page.items).toHaveLength(page.totalItems);
		expect(new Set(ids(page)).size).toBe(page.totalItems);
		expect(modalities).toEqual(new Set(['online', 'in-person', 'hybrid']));
		expect(statuses).toEqual(new Set(['draft', 'active', 'retired']));
		expect(tags.size).toBeGreaterThan(1);
	});

	it('matches a keyword across title, summary, and tags without case sensitivity', () => {
		const page = expectPage({ q: 'SECURITY' });

		expect(ids(page)).toEqual(['course-001', 'course-003', 'course-004', 'course-002']);
		expect(page.items.map((course) => course.id)).toContain('course-002');
		expect(page.items.map((course) => course.id)).toContain('course-003');
		expect(page.items.map((course) => course.id)).toContain('course-004');
		expect(page.totalItems).toBe(4);
	});

	it('filters by modality, status, and tag', () => {
		expect(ids(expectPage({ modality: 'online' }))).toEqual(['course-005', 'course-001', 'course-014', 'course-010', 'course-004', 'course-008']);
		expect(ids(expectPage({ status: 'active' }))).toEqual(['course-005', 'course-006', 'course-001', 'course-003', 'course-007', 'course-014', 'course-010', 'course-011']);
		expect(ids(expectPage({ tag: 'AI' }))).toEqual(['course-006', 'course-001']);
		expect(ids(expectPage({ tag: 'SECURITY' }))).toEqual(['course-001', 'course-004']);
	});

	it('combines keyword, modality, and status', () => {
		const page = expectPage({ q: 'security', modality: 'online', status: 'active', tag: 'ai', page: '1', pageSize: '5', sort: 'title' });

		expect(page).toEqual({
			items: [
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
			],
			page: 1,
			pageSize: 5,
			totalItems: 1,
			totalPages: 1,
		});
	});

	it('combines modality and tag', () => {
		expect(ids(expectPage({ modality: 'hybrid', tag: 'ai' }))).toEqual(['course-006']);
	});

	it('paginates with page and pageSize', () => {
		const page = expectPage({ page: '2', pageSize: '5' });

		expect(page.page).toBe(2);
		expect(page.pageSize).toBe(5);
		expect(page.items).toHaveLength(5);
		expect(page.totalItems).toBe(14);
		expect(page.totalPages).toBe(3);
		expect(ids(page)).toEqual(['course-003', 'course-007', 'course-014', 'course-010', 'course-011']);
	});

	it('uses the maximum page size and leaves a page past the end empty', () => {
		expect(expectPage({ pageSize: '50' }).items).toHaveLength(14);

		const pastTheEnd = expectPage({ page: '9' });
		expect(pastTheEnd.items).toEqual([]);
		expect(pastTheEnd.page).toBe(9);
		expect(pastTheEnd.pageSize).toBe(10);
		expect(pastTheEnd.totalItems).toBe(14);
		expect(pastTheEnd.totalPages).toBe(2);
	});

	it('sorts by createdAt and updatedAt ascending', () => {
		expect(ids(expectPage({ sort: 'createdAt', pageSize: '50' }))).toEqual(CREATED_AT_IDS);
		expect(ids(expectPage({ sort: 'updatedAt', pageSize: '50' }))).toEqual(UPDATED_AT_IDS);
		expect(ids(expectPage({ sort: 'title' }))).toEqual(DEFAULT_IDS);
	});

	it('returns an empty page when nothing matches', () => {
		expect(expectPage({ q: 'zzznomatch' })).toEqual({
			items: [],
			page: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
		});
	});

	it('rejects invalid modality, status, page, pageSize, sort, tag, and unknown parameters', () => {
		expect(searchCourses({ modality: 'Online' })).toEqual(invalid([{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' }]));
		expect(searchCourses({ status: 'archived' })).toEqual(invalid([{ field: 'status', message: 'status must be one of draft, active, retired.' }]));
		expect(searchCourses({ page: '0' })).toEqual(invalid([{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]));
		expect(searchCourses({ page: 'abc' })).toEqual(invalid([{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]));
		expect(searchCourses({ pageSize: '0' })).toEqual(invalid([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]));
		expect(searchCourses({ pageSize: '51' })).toEqual(invalid([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]));
		expect(searchCourses({ pageSize: 'nope' })).toEqual(invalid([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]));
		expect(searchCourses({ sort: 'name' })).toEqual(invalid([{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' }]));
		expect(searchCourses({ tag: ' ' })).toEqual(invalid([{ field: 'tag', message: 'tag must be a non-empty string.' }]));
		expect(
			searchCourses({
				modality: 'remote',
				status: 'archived',
				page: '0',
				pageSize: '51',
				sort: 'rank',
				limit: '5',
			}),
		).toEqual(
			invalid([
				{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' },
				{ field: 'status', message: 'status must be one of draft, active, retired.' },
				{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
				{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
				{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' },
				{ field: 'limit', message: 'limit is not a supported query parameter.' },
			]),
		);
	});

	it('treats a blank keyword as no keyword filter', () => {
		expect(searchCourses({ q: '   ' })).toEqual(searchCourses({}));
	});

	it('does not let callers mutate the stored catalog', () => {
		const page = expectPage({});
		const tags = page.items[0]?.tags;
		if (tags === undefined) {
			throw new Error('expected a course');
		}
		tags.push('mutated');

		expect(expectPage({}).items[0]?.tags).not.toContain('mutated');
	});

	it('is available from the application services factory', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();

		expect(services.courses.search({ q: 'security', modality: 'online', status: 'active' })).toEqual(searchCourses({ q: 'security', modality: 'online', status: 'active' }));
	});
});

function expectPage(query: CourseSearchQuery): CoursePage {
	const result = searchCourses(query);
	if (!result.ok) {
		throw new Error(`expected a catalog page: ${JSON.stringify(result.error)}`);
	}
	return result.body;
}

function ids(page: CoursePage): string[] {
	return page.items.map((course) => course.id);
}

function invalid(details: { field: string; message: string }[]): CourseSearchResult {
	return {
		ok: false,
		error: {
			code: 'INVALID_QUERY_PARAMETER',
			message: 'One or more query parameters are invalid.',
			details,
		},
	};
}
