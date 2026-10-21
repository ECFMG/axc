import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, type CourseListResult, type CoursePage, type CourseQueryError, type CourseQueryInput } from './index.ts';

describe('course search', () => {
	it('returns the first page sorted by title', async () => {
		const page = await search();
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(13);
		expect(page.totalPages).toBe(2);
		expect(page.items).toHaveLength(10);
		expect(page.items.map((course) => course.id)).toEqual(['course-009', 'course-001', 'course-012', 'course-005', 'course-004', 'course-008', 'course-013', 'course-007', 'course-006', 'course-002']);
		expect(page.items[0]).toMatchObject({
			id: 'course-009',
			title: 'Accessibility Reviews',
			modality: 'online',
			status: 'active',
			tags: ['accessibility'],
		});
	});

	it('matches a keyword in the title, summary, or tags regardless of case', async () => {
		const matches = await search({ q: 'SECURITY' });
		expect(matches.items.map((course) => course.id)).toEqual(['course-001', 'course-011', 'course-010']);
		expect(await ids({ q: 'labs' })).toEqual(['course-012']);
		expect(await ids({ q: 'inclusive' })).toEqual(['course-009']);
	});

	it('ignores a blank keyword', async () => {
		const page = await search({ q: '   ' });
		expect(page.totalItems).toBe(13);
	});

	it('filters by modality, status, and tag', async () => {
		expect(await ids({ modality: 'online' })).toEqual(['course-009', 'course-001', 'course-005', 'course-013', 'course-006']);
		expect(await ids({ status: 'active' })).toEqual(['course-009', 'course-001', 'course-012', 'course-004', 'course-013', 'course-002']);
		expect(await ids({ tag: 'AI' })).toEqual(['course-001']);
		expect(await ids({ tag: ' leadership ' })).toEqual(['course-013']);
	});

	it('combines keyword, modality, and status', async () => {
		const page = await search({ q: 'security', modality: 'online', status: 'active' });
		expect(page.items.map((course) => course.id)).toEqual(['course-001']);
		expect(page.totalItems).toBe(1);
		expect(page.totalPages).toBe(1);
	});

	it('paginates and reports totals for a short page', async () => {
		const page = await search({ page: '1', pageSize: '5' });
		expect(page.items).toHaveLength(5);
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(5);
		expect(page.totalItems).toBe(13);
		expect(page.totalPages).toBe(3);
		const second = await search({ page: '2', pageSize: '10' });
		expect(second.items.map((course) => course.id)).toEqual(['course-011', 'course-010', 'course-003']);
		const pastEnd = await search({ page: '3', pageSize: '10' });
		expect(pastEnd.items).toEqual([]);
		expect(pastEnd.totalItems).toBe(13);
		expect(pastEnd.totalPages).toBe(2);
	});

	it('sorts by createdAt and updatedAt', async () => {
		expect((await search({ sort: 'createdAt' })).items[0]?.id).toBe('course-006');
		expect((await search({ sort: 'updatedAt' })).items[0]?.id).toBe('course-008');
		expect((await search({ sort: 'title' })).items[0]?.id).toBe('course-009');
	});

	it('returns an empty page when nothing matches', async () => {
		const page = await search({ q: 'zzzz-no-course' });
		expect(page).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('rejects invalid modality, status, page, pageSize, and sort values', async () => {
		expect((await errorOf({ modality: 'remote' })).details).toEqual([{ field: 'modality', message: 'modality must be one of online, in-person, or hybrid.' }]);
		expect((await errorOf({ status: 'Active' })).details[0]?.field).toBe('status');
		expect((await errorOf({ page: '0' })).details).toEqual([{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]);
		expect((await errorOf({ pageSize: '51' })).details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
		expect((await errorOf({ pageSize: '0' })).details[0]?.field).toBe('pageSize');
		expect((await errorOf({ sort: 'id' })).details).toEqual([{ field: 'sort', message: 'sort must be one of title, createdAt, or updatedAt.' }]);
	});

	it('rejects repeated and unknown query parameters', async () => {
		const error = await errorOf({ modality: ['online', 'hybrid'], limit: '5', pageSize: '99' });
		expect(error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(error.message).toBe('One or more query parameters are invalid.');
		expect(error.details.map((detail) => detail.field)).toEqual(['modality', 'pageSize', 'limit']);
	});

	it('accepts the maximum page size', async () => {
		const page = await search({ pageSize: '50' });
		expect(page.pageSize).toBe(50);
		expect(page.items).toHaveLength(13);
		expect(page.totalPages).toBe(1);
	});
});

async function search(values: Record<string, string | readonly string[]> = {}): Promise<CoursePage> {
	const result = await run(values);
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error(result.error.message);
	}
	return result.page;
}

async function ids(values: Record<string, string | readonly string[]>): Promise<string[]> {
	const page = await search(values);
	return page.items.map((course) => course.id);
}

async function errorOf(values: Record<string, string | readonly string[]>): Promise<CourseQueryError> {
	const result = await run(values);
	expect(result.ok).toBe(false);
	if (result.ok) {
		throw new Error('expected a query error');
	}
	return result.error;
}

async function run(values: Record<string, string | readonly string[]>): Promise<CourseListResult> {
	const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
	return services.courses.list(query(values));
}

function query(values: Record<string, string | readonly string[]>): CourseQueryInput {
	const parsed: Record<string, readonly string[]> = {};
	for (const [key, value] of Object.entries(values)) {
		parsed[key] = typeof value === 'string' ? [value] : value;
	}
	return parsed;
}
