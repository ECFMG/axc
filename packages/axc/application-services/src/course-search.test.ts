import { describe, expect, it } from 'vitest';
import { DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, type RawCourseQuery } from './course-search.ts';
import { buildApplicationServicesFactory } from './index.ts';

async function search(rawQuery: RawCourseQuery = {}) {
	const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
	return services.courses.search(rawQuery);
}

async function expectInvalid(rawQuery: RawCourseQuery, field: string, message: string) {
	await expect(search(rawQuery)).rejects.toEqual(
		expect.objectContaining({
			name: 'QueryValidationError',
			code: 'INVALID_QUERY_PARAMETER',
			message: 'One or more query parameters are invalid.',
			details: expect.arrayContaining([{ field, message }]),
		}),
	);
}

describe('course catalog search', () => {
	it('returns a paginated list with default page and page size', async () => {
		const result = await search();

		expect(result.page).toBe(DEFAULT_COURSE_PAGE);
		expect(result.pageSize).toBe(DEFAULT_COURSE_PAGE_SIZE);
		expect(result.items.length).toBeLessThanOrEqual(DEFAULT_COURSE_PAGE_SIZE);
		expect(result.totalItems).toBeGreaterThanOrEqual(12);
		expect(result.totalPages).toBe(Math.ceil(result.totalItems / result.pageSize));
		expect(result.items.map((course) => course.title)).toEqual([...result.items].map((course) => course.title).sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' })));
	});

	it('matches keywords case-insensitively across title, summary, and tags', async () => {
		const byTitle = await search({ q: 'ACCESSIBILITY' });
		const bySummary = await search({ q: 'instructor-led' });
		const byTag = await search({ q: 'SECURITY' });

		expect(byTitle.items.map((course) => course.id)).toEqual(['course-010']);
		expect(bySummary.items.map((course) => course.id)).toEqual(['course-002']);
		expect(byTag.items.map((course) => course.id).sort()).toEqual(['course-001', 'course-006', 'course-011']);
	});

	it('filters by modality, status, and tag', async () => {
		const online = await search({ modality: 'online', pageSize: '50' });
		const active = await search({ status: 'active', pageSize: '50' });
		const aiTag = await search({ tag: 'AI', pageSize: '50' });

		expect(online.items.length).toBeGreaterThan(0);
		expect(online.items.every((course) => course.modality === 'online')).toBe(true);
		expect(active.items.length).toBeGreaterThan(0);
		expect(active.items.every((course) => course.status === 'active')).toBe(true);
		expect(aiTag.items.map((course) => course.id).sort()).toEqual(['course-001', 'course-007', 'course-013']);
		expect(aiTag.items.every((course) => course.tags.some((tag) => tag.toLowerCase() === 'ai'))).toBe(true);
	});

	it('applies combined keyword, modality, and status filters', async () => {
		const result = await search({ q: 'security', modality: 'online', status: 'active' });

		expect(result.items.map((course) => course.id)).toEqual(['course-001']);
		expect(result.totalItems).toBe(1);
		expect(result.totalPages).toBe(1);
	});

	it('paginates with page and pageSize', async () => {
		const firstPage = await search({ page: '1', pageSize: '5', sort: 'title' });
		const secondPage = await search({ page: '2', pageSize: '5', sort: 'title' });
		const all = await search({ pageSize: '50', sort: 'title' });

		expect(firstPage.items).toHaveLength(5);
		expect(firstPage.page).toBe(1);
		expect(firstPage.pageSize).toBe(5);
		expect(firstPage.totalItems).toBe(all.totalItems);
		expect(firstPage.totalPages).toBe(Math.ceil(all.totalItems / 5));
		expect(secondPage.items).toHaveLength(5);
		expect([...firstPage.items, ...secondPage.items].map((course) => course.id)).toEqual(all.items.slice(0, 10).map((course) => course.id));
	});

	it('sorts by createdAt ascending', async () => {
		const result = await search({ sort: 'createdAt', pageSize: '50' });
		const createdAtValues = result.items.map((course) => course.createdAt);

		expect(createdAtValues).toEqual([...createdAtValues].sort());
		expect(result.items[0]?.title).toBe('Classroom Facilitation');
	});

	it('returns an empty list when nothing matches', async () => {
		const result = await search({ q: 'no-such-course-zzzz' });

		expect(result.items).toEqual([]);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalItems).toBe(0);
		expect(result.totalPages).toBe(0);
	});

	it('rejects invalid query parameters', async () => {
		await expectInvalid({ modality: 'webinar' }, 'modality', 'modality must be one of: online, in-person, hybrid.');
		await expectInvalid({ status: 'archived' }, 'status', 'status must be one of: draft, active, retired.');
		await expectInvalid({ page: '0' }, 'page', 'page must be an integer greater than or equal to 1.');
		await expectInvalid({ page: 'abc' }, 'page', 'page must be an integer greater than or equal to 1.');
		await expectInvalid({ pageSize: '0' }, 'pageSize', 'pageSize must be between 1 and 50.');
		await expectInvalid({ pageSize: '51' }, 'pageSize', 'pageSize must be between 1 and 50.');
		await expectInvalid({ sort: 'popularity' }, 'sort', 'sort must be one of: title, createdAt, updatedAt.');
	});
});
