import { describe, expect, it } from 'vitest';
import type { CoursePage, CourseSearchErrorBody, CourseSearchQuery } from './course-catalog.ts';
import { buildApplicationServicesFactory } from './index.ts';

const search = async (query: CourseSearchQuery) => (await buildApplicationServicesFactory({ environment: 'test' }).forRequest()).courses.search(query);

const page = async (query: CourseSearchQuery): Promise<CoursePage> => {
	const outcome = await search(query);
	expect(outcome.status).toBe(200);
	return outcome.body as CoursePage;
};

const failure = async (query: CourseSearchQuery): Promise<CourseSearchErrorBody> => {
	const outcome = await search(query);
	expect(outcome.status).toBe(400);
	return outcome.body as CourseSearchErrorBody;
};

describe('course catalog search', () => {
	it('returns the first page with default pagination sorted by title', async () => {
		const result = await page({});

		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalItems).toBe(14);
		expect(result.totalPages).toBe(2);
		expect(result.items).toHaveLength(10);
		expect(result.items.map((course) => course.title)).toEqual([...result.items.map((course) => course.title)].sort((a, b) => a.localeCompare(b)));
		expect(result.items.find((course) => course.id === 'course-001')).toEqual({
			id: 'course-001',
			title: 'AI Security Foundations',
			summary: 'Introductory course on secure AI-assisted development.',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: '2026-01-15T00:00:00.000Z',
			updatedAt: '2026-06-01T00:00:00.000Z',
		});
	});

	it('matches the keyword in title, summary or tags case-insensitively', async () => {
		const ids = (await page({ q: 'SECURITY' })).items.map((course) => course.id);

		expect(ids).toContain('course-001'); // title
		expect(ids).toContain('course-014'); // summary
		expect(ids).toContain('course-007'); // tag
	});

	it('filters by modality', async () => {
		const result = await page({ modality: 'in-person', pageSize: '50' });

		expect(result.items).toHaveLength(4);
		expect(result.items.every((course) => course.modality === 'in-person')).toBe(true);
	});

	it('filters by status', async () => {
		const result = await page({ status: 'retired', pageSize: '50' });

		expect(result.items.map((course) => course.id)).toEqual(['course-007', 'course-010', 'course-014']);
	});

	it('filters by tag case-insensitively', async () => {
		const result = await page({ tag: 'AI', pageSize: '50' });

		expect(result.items.map((course) => course.id)).toEqual(['course-002', 'course-001', 'course-009']);
	});

	it('combines keyword, modality and status filters', async () => {
		const result = await page({ q: 'security', modality: 'online', status: 'active' });

		expect(result.items.map((course) => course.id)).toEqual(['course-001']);
		expect(result.totalItems).toBe(1);
		expect(result.totalPages).toBe(1);
	});

	it('paginates', async () => {
		const first = await page({ page: '1', pageSize: '5' });
		const third = await page({ page: '3', pageSize: '5' });

		expect(first.items).toHaveLength(5);
		expect(first.totalItems).toBe(14);
		expect(first.totalPages).toBe(3);
		expect(third.items).toHaveLength(4);
		expect(third.items.map((course) => course.id)).not.toContain(first.items[0]?.id);
	});

	it('sorts by createdAt and updatedAt', async () => {
		const byCreatedAt = (await page({ sort: 'createdAt', pageSize: '50' })).items.map((course) => course.createdAt);
		const byUpdatedAt = (await page({ sort: 'updatedAt', pageSize: '50' })).items.map((course) => course.updatedAt);

		expect(byCreatedAt).toEqual([...byCreatedAt].sort());
		expect(byUpdatedAt).toEqual([...byUpdatedAt].sort());
		expect(byCreatedAt[0]).toBe('2024-06-18T00:00:00.000Z');
	});

	it.each([
		['modality', { modality: 'remote' }],
		['status', { status: 'archived' }],
		['sort', { sort: 'id' }],
		['page', { page: '0' }],
		['page', { page: 'two' }],
		['pageSize', { pageSize: '51' }],
		['pageSize', { pageSize: '-1' }],
	])('rejects an invalid %s', async (field, query) => {
		const body = await failure(query);

		expect(body.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(body.error.message).toBe('One or more query parameters are invalid.');
		expect(body.error.details.map((detail) => detail.field)).toContain(field);
	});

	it('reports every invalid parameter in one response', async () => {
		const body = await failure({ modality: 'remote', pageSize: '500' });

		expect(body.error.details).toHaveLength(2);
	});

	it('returns an empty page rather than an error when nothing matches', async () => {
		const result = await page({ q: 'underwater basket weaving' });

		expect(result.items).toEqual([]);
		expect(result.totalItems).toBe(0);
		expect(result.totalPages).toBe(0);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
	});
});
