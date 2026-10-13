import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, type CourseSearchPage, type CourseSearchRequest, type CourseSearchResult } from './index.ts';

async function search(request: CourseSearchRequest = {}): Promise<CourseSearchResult> {
	const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
	return services.courses.search(request);
}

async function page(request: CourseSearchRequest = {}): Promise<CourseSearchPage> {
	const result = await search(request);
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error('expected a course page');
	}
	return result.page;
}

function ids(result: CourseSearchPage): string[] {
	return result.items.map((item) => item.id);
}

describe('course catalog search', () => {
	it('returns the first page of 10 courses sorted by title', async () => {
		const result = await page();

		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalItems).toBe(12);
		expect(result.totalPages).toBe(2);
		expect(result.items).toHaveLength(10);
		expect(ids(result)).toEqual(['course-009', 'course-001', 'course-004', 'course-010', 'course-005', 'course-006', 'course-007', 'course-008', 'course-012', 'course-003']);
	});

	it('matches a keyword across title, summary, and tags regardless of case', async () => {
		const result = await page({ q: 'SeCuRiTy' });

		expect(ids(result)).toEqual(['course-001', 'course-007', 'course-011', 'course-002']);
		expect(result.items.map((item) => item.title)).toContain('Incident Response');
		expect(result.items.flatMap((item) => item.tags)).toContain('Security');
		expect(ids(result)).not.toContain('course-009');
	});

	it('filters by modality, status, and tag', async () => {
		expect(ids(await page({ modality: ' online ' }))).toEqual(['course-009', 'course-001', 'course-005', 'course-007', 'course-011']);
		expect(ids(await page({ status: 'active' }))).toEqual(['course-009', 'course-001', 'course-006', 'course-012', 'course-011', 'course-002']);
		expect(ids(await page({ tag: 'AI' }))).toEqual(['course-001', 'course-006']);
	});

	it('combines keyword, modality, and status filters', async () => {
		const result = await page({ q: 'security', modality: 'online', status: 'active' });

		expect(ids(result)).toEqual(['course-001', 'course-011']);
		expect(result.totalItems).toBe(2);
	});

	it('paginates with page and pageSize', async () => {
		const result = await page({ page: '2', pageSize: '5' });

		expect(result.page).toBe(2);
		expect(result.pageSize).toBe(5);
		expect(result.totalItems).toBe(12);
		expect(result.totalPages).toBe(3);
		expect(ids(result)).toEqual(['course-006', 'course-007', 'course-008', 'course-012', 'course-003']);
	});

	it('sorts by createdAt ascending', async () => {
		const result = await page({ sort: 'createdAt', pageSize: '50' });

		expect(ids(result)).toEqual(['course-010', 'course-004', 'course-007', 'course-012', 'course-001', 'course-006', 'course-002', 'course-003', 'course-009', 'course-005', 'course-008', 'course-011']);
	});

	it('returns an empty page when nothing matches', async () => {
		const result = await page({ q: 'zzzz-not-a-course' });

		expect(result).toEqual({
			items: [],
			page: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
		});
	});

	it('rejects invalid modality, status, page, pageSize, and sort together', async () => {
		const result = await search({ modality: 'remote', status: 'published', page: '0', pageSize: '51', sort: 'rank' });

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [
					{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' },
					{ field: 'status', message: 'status must be one of draft, active, retired.' },
					{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
					{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' },
				],
			},
		});
	});

	it('rejects an unknown query parameter', async () => {
		const result = await search({ unknown: ['foo'] });

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}
		expect(result.error.details).toEqual([{ field: 'foo', message: 'foo is not a supported query parameter.' }]);
	});
});
