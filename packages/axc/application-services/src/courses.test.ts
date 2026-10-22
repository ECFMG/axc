import type { Course } from '@axc/domain';
import { createMemoryCatalog } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { ApiError, type ApplicationServices, type QueryParameters } from './index.ts';
import { createTestServices } from './test-support/context.ts';

const sampleCourses: readonly Course[] = [
	{
		id: 'course-a',
		title: 'Security Basics',
		summary: 'Intro',
		modality: 'online',
		status: 'active',
		tags: ['ai'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-02T00:00:00.000Z',
	},
	{
		id: 'course-b',
		title: 'Leadership',
		summary: 'People skills and security reviews',
		modality: 'in-person',
		status: 'draft',
		tags: ['leadership'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-02T00:00:00.000Z',
	},
	{
		id: 'course-c',
		title: 'Labs',
		summary: 'Practice',
		modality: 'hybrid',
		status: 'retired',
		tags: ['security'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-02T00:00:00.000Z',
	},
];

function openServices(courses: readonly Course[] = sampleCourses): Promise<ApplicationServices> {
	return createTestServices({ catalog: createMemoryCatalog(courses) });
}

function searchError(services: ApplicationServices, query: QueryParameters): ApiError {
	try {
		services.courses.search(query);
	} catch (error) {
		if (error instanceof ApiError) {
			return error;
		}
		throw error;
	}
	throw new Error('expected ApiError');
}

describe('course search', () => {
	it('returns the first page with default pagination and title sort', async () => {
		const services = await openServices();
		const page = services.courses.search({});

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(3);
		expect(page.totalPages).toBe(1);
		expect(page.items.map((course) => course.id)).toEqual(['course-c', 'course-b', 'course-a']);
	});

	it('matches a keyword in title, summary, or tags regardless of case', async () => {
		const services = await openServices();

		expect(services.courses.search({ q: ['SECURITY'] }).items.map((course) => course.id)).toEqual(['course-c', 'course-b', 'course-a']);
		expect(services.courses.search({ q: ['basics'] }).items.map((course) => course.id)).toEqual(['course-a']);
		expect(services.courses.search({ q: ['reviews'] }).items.map((course) => course.id)).toEqual(['course-b']);
		expect(services.courses.search({ q: ['sec'] }).items.map((course) => course.id)).toEqual(['course-c', 'course-b', 'course-a']);
	});

	it('filters by modality, status, and exact tag', async () => {
		const services = await openServices();

		expect(services.courses.search({ modality: ['online'] }).items.map((course) => course.id)).toEqual(['course-a']);
		expect(services.courses.search({ status: ['draft'] }).items.map((course) => course.id)).toEqual(['course-b']);
		expect(services.courses.search({ tag: ['AI'] }).items.map((course) => course.id)).toEqual(['course-a']);
		expect(services.courses.search({ tag: ['sec'] }).items).toEqual([]);
	});

	it('combines keyword, modality, and status', async () => {
		const services = await openServices();
		const page = services.courses.search({ q: ['security'], modality: ['online'], status: ['active'] });

		expect(page.items.map((course) => course.id)).toEqual(['course-a']);
		expect(page.totalItems).toBe(1);
	});

	it('paginates and reports an empty page past the end', async () => {
		const services = await openServices();
		const page = services.courses.search({ page: ['2'], pageSize: ['2'] });

		expect(page.items.map((course) => course.id)).toEqual(['course-a']);
		expect(page.page).toBe(2);
		expect(page.pageSize).toBe(2);
		expect(page.totalItems).toBe(3);
		expect(page.totalPages).toBe(2);

		const pastEnd = services.courses.search({ page: ['4'], pageSize: ['2'] });
		expect(pastEnd.items).toEqual([]);
		expect(pastEnd.totalItems).toBe(3);
		expect(pastEnd.totalPages).toBe(2);
	});

	it('sorts by createdAt and updatedAt', async () => {
		const services = await openServices();

		expect(services.courses.search({ sort: ['createdAt'] }).items.map((course) => course.id)).toEqual(['course-a', 'course-b', 'course-c']);
		expect(services.courses.search({ sort: ['updatedAt'] }).items.map((course) => course.id)).toEqual(['course-a', 'course-b', 'course-c']);
	});

	it('returns an empty page when nothing matches', async () => {
		const services = await openServices();
		const page = services.courses.search({ q: ['zzzz-not-a-course'] });

		expect(page).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('rejects invalid query parameters together', async () => {
		const services = await openServices();
		const error = searchError(services, { modality: ['classroom'], status: ['open'], page: ['0'], pageSize: ['51'], sort: ['rating'], limit: ['1'] });

		expect(error.status).toBe(400);
		expect(error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(error.message).toBe('One or more query parameters are invalid.');
		expect(error.details).toEqual([
			{ field: 'limit', message: 'limit is not a supported query parameter.' },
			{ field: 'modality', message: 'modality must be online, in-person, or hybrid.' },
			{ field: 'status', message: 'status must be draft, active, or retired.' },
			{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
			{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
			{ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' },
		]);
	});

	it('rejects an empty or repeated query parameter', async () => {
		const services = await openServices();

		expect(searchError(services, { q: ['  '] }).details).toEqual([{ field: 'q', message: 'q must not be empty.' }]);
		expect(searchError(services, { page: ['1', '2'] }).details).toEqual([{ field: 'page', message: 'page must be provided once.' }]);
	});
});

describe('seeded course catalog', () => {
	it('paginates the 12 fixture courses and keeps the documented filters', async () => {
		const services = await createTestServices({ catalog: createMemoryCatalog() });
		const page = services.courses.search({});

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(2);
		expect(page.items[0]?.id).toBe('course-001');
		expect(page.items).toHaveLength(10);

		const secondPage = services.courses.search({ page: ['2'] });
		expect(secondPage.items.map((course) => course.id)).toEqual(['course-010', 'course-002']);

		const documented = services.courses.search({ q: ['foundations'], modality: ['online'], status: ['active'], tag: ['ai'], page: ['1'], pageSize: ['5'], sort: ['title'] });
		expect(documented.totalItems).toBe(1);
		expect(documented.items[0]).toMatchObject({
			id: 'course-001',
			title: 'AI Security Foundations',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
		});

		expect(services.courses.search({ sort: ['createdAt'], pageSize: ['1'] }).items[0]?.id).toBe('course-010');
		expect(services.courses.search({ sort: ['updatedAt'], pageSize: ['1'] }).items[0]?.id).toBe('course-005');
		expect(services.courses.search({ pageSize: ['50'] }).items).toHaveLength(12);
	});
});
