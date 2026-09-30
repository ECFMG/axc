import { describe, expect, it } from 'vitest';
import { COURSE_CATALOG, InvalidQueryParameterError, listCourses } from './courses.ts';
import { buildApplicationServicesFactory } from './index.ts';

async function coursesService() {
	const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
	return services.courses;
}

describe('course catalog search', () => {
	it('returns a paginated list with default page and page size', async () => {
		const result = (await coursesService()).list({});

		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.items).toHaveLength(10);
		expect(result.totalItems).toBe(COURSE_CATALOG.length);
		expect(result.totalItems).toBeGreaterThanOrEqual(12);
		expect(result.totalPages).toBe(Math.ceil(COURSE_CATALOG.length / 10));
		expect(result.items.map((course) => course.title)).toStrictEqual(
			[...COURSE_CATALOG]
				.sort((left, right) => left.title.localeCompare(right.title))
				.slice(0, 10)
				.map((course) => course.title),
		);
	});

	it('matches keyword search case-insensitively across title, summary, and tags', () => {
		const result = listCourses({ q: 'SECURITY', pageSize: '50' });

		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.some((course) => course.title.toLowerCase().includes('security'))).toBe(true);
		expect(result.items.some((course) => course.summary.toLowerCase().includes('security'))).toBe(true);
		expect(result.items.some((course) => course.tags.some((tag) => tag.toLowerCase().includes('security')))).toBe(true);
		for (const course of result.items) {
			const haystack = `${course.title} ${course.summary} ${course.tags.join(' ')}`.toLowerCase();
			expect(haystack.includes('security')).toBe(true);
		}
	});

	it('filters by modality', () => {
		const result = listCourses({ modality: 'online', pageSize: '50' });

		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.modality === 'online')).toBe(true);
	});

	it('filters by status', () => {
		const result = listCourses({ status: 'active', pageSize: '50' });

		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.status === 'active')).toBe(true);
	});

	it('filters by tag case-insensitively', () => {
		const result = listCourses({ tag: 'AI', pageSize: '50' });

		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.tags.some((tag) => tag.toLowerCase() === 'ai'))).toBe(true);
	});

	it('applies combined keyword, modality, and status filters', () => {
		const result = listCourses({ q: 'security', modality: 'online', status: 'active', pageSize: '50' });

		expect(result.items.length).toBeGreaterThan(0);
		for (const course of result.items) {
			const haystack = `${course.title} ${course.summary} ${course.tags.join(' ')}`.toLowerCase();
			expect(haystack.includes('security')).toBe(true);
			expect(course.modality).toBe('online');
			expect(course.status).toBe('active');
		}
	});

	it('paginates with the requested page and page size', () => {
		const firstPage = listCourses({ page: '1', pageSize: '5', sort: 'title' });
		const secondPage = listCourses({ page: '2', pageSize: '5', sort: 'title' });
		const all = listCourses({ pageSize: '50', sort: 'title' });

		expect(firstPage.items).toHaveLength(5);
		expect(firstPage.page).toBe(1);
		expect(firstPage.pageSize).toBe(5);
		expect(firstPage.totalItems).toBe(COURSE_CATALOG.length);
		expect(firstPage.totalPages).toBe(Math.ceil(COURSE_CATALOG.length / 5));
		expect(firstPage.items.map((course) => course.id)).toStrictEqual(all.items.slice(0, 5).map((course) => course.id));
		expect(secondPage.items.map((course) => course.id)).toStrictEqual(all.items.slice(5, 10).map((course) => course.id));
	});

	it('sorts by createdAt ascending', () => {
		const result = listCourses({ sort: 'createdAt', pageSize: '50' });
		const createdAtValues = result.items.map((course) => course.createdAt);

		expect(createdAtValues).toStrictEqual([...createdAtValues].sort((left, right) => left.localeCompare(right)));
	});

	it('sorts by updatedAt ascending', () => {
		const result = listCourses({ sort: 'updatedAt', pageSize: '50' });
		const updatedAtValues = result.items.map((course) => course.updatedAt);

		expect(updatedAtValues).toStrictEqual([...updatedAtValues].sort((left, right) => left.localeCompare(right)));
	});

	it('returns an empty list with pagination metadata when nothing matches', () => {
		const result = listCourses({ q: 'zzzz-no-such-course' });

		expect(result.items).toStrictEqual([]);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalItems).toBe(0);
		expect(result.totalPages).toBe(0);
	});

	it('rejects invalid modality, status, page, pageSize, and sort values', () => {
		const invalidCases: Array<{ query: Parameters<typeof listCourses>[0]; field: string }> = [
			{ query: { modality: 'remote' }, field: 'modality' },
			{ query: { status: 'published' }, field: 'status' },
			{ query: { page: '0' }, field: 'page' },
			{ query: { page: '1.5' }, field: 'page' },
			{ query: { page: 'abc' }, field: 'page' },
			{ query: { pageSize: '0' }, field: 'pageSize' },
			{ query: { pageSize: '51' }, field: 'pageSize' },
			{ query: { pageSize: 'ten' }, field: 'pageSize' },
			{ query: { sort: 'popularity' }, field: 'sort' },
		];

		for (const invalidCase of invalidCases) {
			try {
				listCourses(invalidCase.query);
				throw new Error(`expected validation failure for ${invalidCase.field}`);
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidQueryParameterError);
				if (error instanceof InvalidQueryParameterError) {
					expect(error.code).toBe('INVALID_QUERY_PARAMETER');
					expect(error.message).toBe('One or more query parameters are invalid.');
					expect(error.details.some((detail) => detail.field === invalidCase.field)).toBe(true);
				}
			}
		}
	});

	it('collects multiple invalid query parameters in one error', () => {
		try {
			listCourses({ modality: 'remote', pageSize: '99', sort: 'popularity' });
			throw new Error('expected validation failure');
		} catch (error) {
			expect(error).toBeInstanceOf(InvalidQueryParameterError);
			if (error instanceof InvalidQueryParameterError) {
				expect(error.details.map((detail) => detail.field)).toStrictEqual(['modality', 'pageSize', 'sort']);
			}
		}
	});
});
