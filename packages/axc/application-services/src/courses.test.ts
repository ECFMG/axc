import { createSeededCourseCatalog } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, type CourseListPage, type CourseQueryErrorBody, type CourseQueryInput, type SearchCoursesResult } from './index.ts';

const catalog = createSeededCourseCatalog();

async function search(query: CourseQueryInput = {}): Promise<SearchCoursesResult> {
	const services = await buildApplicationServicesFactory({ environment: 'test' }, catalog).forRequest();
	return await services.courses.search(query);
}

function expectPage(result: SearchCoursesResult): CourseListPage {
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error('expected a course page');
	}
	return result.body;
}

function expectQueryError(result: SearchCoursesResult): CourseQueryErrorBody {
	expect(result.ok).toBe(false);
	if (result.ok) {
		throw new Error('expected a query error');
	}
	expect(result.body.error.code).toBe('INVALID_QUERY_PARAMETER');
	expect(result.body.error.message).toBe('One or more query parameters are invalid.');
	return result.body;
}

describe('course catalog search', () => {
	it('returns the first page sorted by title with default pagination', async () => {
		const page = expectPage(await search());

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(13);
		expect(page.totalPages).toBe(2);
		expect(page.items).toHaveLength(10);
		expect(page.items.map((item) => item.title)).toEqual([
			'AI Security Foundations',
			'Applied AI Studio',
			'Archive Research Methods',
			'Classroom Safety Drills',
			'Compliance Basics',
			'Data Ethics',
			'Facilitation Skills',
			'Hybrid Leadership Lab',
			'New Hire Onboarding',
			'Privacy Operations',
		]);
	});

	it('matches the documented security search', async () => {
		const page = expectPage(await search({ q: 'security', modality: 'online', status: 'active', tag: 'ai', page: '1', pageSize: '5', sort: 'title' }));

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

	it('matches a keyword in title, summary, or tags regardless of case', async () => {
		const page = expectPage(await search({ q: 'SECURITY' }));
		const ids = page.items.map((item) => item.id);

		expect(ids).toEqual(['course-001', 'course-008', 'course-007', 'course-013', 'course-002']);
		expect(page.items.every((item) => [item.title, item.summary, ...item.tags].some((field) => field.toLocaleLowerCase().includes('security')))).toBe(true);
	});

	it('matches a keyword that appears only in the summary', async () => {
		const page = expectPage(await search({ q: 'reviews' }));

		expect(page.items.map((item) => item.id)).toEqual(['course-007']);
	});

	it('matches a keyword that appears only in a tag', async () => {
		const page = expectPage(await search({ q: 'facilities' }));

		expect(page.items.map((item) => item.id)).toEqual(['course-002']);
	});

	it('trims a keyword before searching', async () => {
		const page = expectPage(await search({ q: '  reviews  ' }));

		expect(page.items.map((item) => item.id)).toEqual(['course-007']);
	});

	it('filters by modality', async () => {
		const page = expectPage(await search({ modality: 'online', pageSize: '50' }));

		expect(page.items.map((item) => item.id)).toEqual(['course-001', 'course-004', 'course-011', 'course-006', 'course-007', 'course-013']);
		expect(page.items.every((item) => item.modality === 'online')).toBe(true);
	});

	it('filters by status', async () => {
		const page = expectPage(await search({ status: 'active', pageSize: '50' }));

		expect(page.totalItems).toBe(7);
		expect(page.items.every((item) => item.status === 'active')).toBe(true);
	});

	it('filters by tag regardless of case', async () => {
		const page = expectPage(await search({ tag: 'AI', pageSize: '50' }));

		expect(page.items.map((item) => item.id)).toEqual(['course-001', 'course-005']);
	});

	it('combines keyword, modality, and status filters', async () => {
		const page = expectPage(await search({ q: 'security', modality: 'in-person', status: 'active', pageSize: '50' }));

		expect(page.items.map((item) => item.id)).toEqual(['course-008', 'course-002']);
	});

	it('paginates with the requested page size', async () => {
		const page = expectPage(await search({ page: '1', pageSize: '5' }));

		expect(page.items).toHaveLength(5);
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(5);
		expect(page.totalItems).toBe(13);
		expect(page.totalPages).toBe(3);
	});

	it('returns the remaining courses on the last page', async () => {
		const page = expectPage(await search({ page: '2', pageSize: '10' }));

		expect(page.items.map((item) => item.id)).toEqual(['course-013', 'course-012', 'course-002']);
		expect(page.totalPages).toBe(2);
	});

	it('returns an empty page when the page is past the end', async () => {
		const page = expectPage(await search({ page: '4', pageSize: '5' }));

		expect(page.items).toEqual([]);
		expect(page.page).toBe(4);
		expect(page.pageSize).toBe(5);
		expect(page.totalItems).toBe(13);
		expect(page.totalPages).toBe(3);
	});

	it('accepts the maximum page size', async () => {
		const page = expectPage(await search({ pageSize: '50' }));

		expect(page.items).toHaveLength(13);
		expect(page.pageSize).toBe(50);
		expect(page.totalPages).toBe(1);
	});

	it('sorts by createdAt ascending', async () => {
		const page = expectPage(await search({ sort: 'createdAt', pageSize: '50' }));

		expect(page.items.map((item) => item.id)).toEqual([
			'course-010',
			'course-004',
			'course-007',
			'course-009',
			'course-001',
			'course-002',
			'course-003',
			'course-005',
			'course-006',
			'course-008',
			'course-011',
			'course-012',
			'course-013',
		]);
	});

	it('sorts by updatedAt ascending', async () => {
		const page = expectPage(await search({ sort: 'updatedAt', pageSize: '50' }));

		expect(page.items.map((item) => item.id)).toEqual([
			'course-010',
			'course-004',
			'course-009',
			'course-002',
			'course-003',
			'course-007',
			'course-005',
			'course-006',
			'course-001',
			'course-008',
			'course-011',
			'course-012',
			'course-013',
		]);
	});

	it('returns an empty list when nothing matches', async () => {
		const page = expectPage(await search({ q: 'zzzz-no-such-course' }));

		expect(page).toEqual({
			items: [],
			page: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
		});
	});

	it('rejects an invalid modality, status, page, pageSize, and sort', async () => {
		const error = expectQueryError(await search({ modality: 'remote', status: 'published', page: '0', pageSize: '51', sort: 'name' }));

		expect(error.error.details).toEqual([
			{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' },
			{ field: 'status', message: 'status must be one of draft, active, retired.' },
			{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
			{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
			{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' },
		]);
	});

	it('rejects a non-numeric pageSize with the documented message', async () => {
		const error = expectQueryError(await search({ pageSize: 'abc' }));

		expect(error.error.details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
	});

	it('rejects duplicate and unexpected query parameters', async () => {
		const error = expectQueryError(await search({ page: ['1', '2'], limit: '10' }));

		expect(error.error.details).toEqual([
			{ field: 'page', message: 'page must be provided once.' },
			{ field: 'limit', message: 'Unexpected query parameter.' },
		]);
	});

	it('rejects a blank tag', async () => {
		const error = expectQueryError(await search({ tag: '   ' }));

		expect(error.error.details).toEqual([{ field: 'tag', message: 'tag must be a non-empty string.' }]);
	});
});
