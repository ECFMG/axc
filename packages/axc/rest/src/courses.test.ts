import { type ApiErrorBody, buildApplicationServicesFactory, type Course, type CourseSearchResult } from '@axc/application-services';
import { beforeAll, describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

// Exercises the delivery layer over the default fixture catalog supplied by @axc/persistence.
const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));

const get = (path: string) => app.request(path);

const body = async <T>(path: string): Promise<{ status: number; payload: T }> => {
	const response = await get(path);
	return { status: response.status, payload: (await response.json()) as T };
};

const listing = (path: string) => body<CourseSearchResult>(path);
const failure = (path: string) => body<ApiErrorBody>(path);

/** Size of the seeded catalog, read back from the endpoint so the tests stay fixture-agnostic. */
let seededCourseCount = 0;

beforeAll(async () => {
	seededCourseCount = (await listing('/api/courses?pageSize=50')).payload.totalItems;
	expect(seededCourseCount).toBeGreaterThanOrEqual(12);
});

describe('GET /api/courses', () => {
	it('returns the first page with default pagination and title ordering', async () => {
		const { status, payload } = await listing('/api/courses');

		expect(status).toBe(200);
		expect(payload.page).toBe(1);
		expect(payload.pageSize).toBe(10);
		expect(payload.totalItems).toBe(seededCourseCount);
		expect(payload.totalPages).toBe(Math.ceil(seededCourseCount / 10));
		expect(payload.items).toHaveLength(10);
		expect(payload.items.map((course: Course) => course.title.toLowerCase())).toStrictEqual([...payload.items].map((course: Course) => course.title.toLowerCase()).sort());
	});

	it('returns every documented field on each item', async () => {
		const { payload } = await listing('/api/courses?pageSize=1');

		expect(Object.keys(payload.items[0] ?? {}).sort()).toStrictEqual(['createdAt', 'id', 'modality', 'status', 'summary', 'tags', 'title', 'updatedAt']);
	});

	it('matches q case-insensitively against title, summary and tags', async () => {
		const { payload } = await listing('/api/courses?q=SECURITY&pageSize=50');
		const ids = payload.items.map((course: Course) => course.id);

		// course-001 matches on title, course-007 on summary text, course-014 on an upper-case tag.
		expect(ids).toContain('course-001');
		expect(ids).toContain('course-007');
		expect(ids).toContain('course-014');
		expect(payload.totalItems).toBe(ids.length);
	});

	it.each(['online', 'in-person', 'hybrid'] as const)('filters by modality=%s', async (modality) => {
		const { status, payload } = await listing(`/api/courses?modality=${modality}&pageSize=50`);

		expect(status).toBe(200);
		expect(payload.items.length).toBeGreaterThan(0);
		expect(payload.items.every((course: Course) => course.modality === modality)).toBe(true);
	});

	it.each(['draft', 'active', 'retired'] as const)('filters by status=%s', async (status) => {
		const { payload } = await listing(`/api/courses?status=${status}&pageSize=50`);

		expect(payload.items.length).toBeGreaterThan(0);
		expect(payload.items.every((course: Course) => course.status === status)).toBe(true);
	});

	it('filters by tag case-insensitively', async () => {
		const { payload } = await listing('/api/courses?tag=AI&pageSize=50');

		expect(payload.items.map((course: Course) => course.id)).toStrictEqual(['course-002', 'course-001', 'course-011']);
	});

	it('combines q, modality and status', async () => {
		const { payload } = await listing('/api/courses?q=security&modality=online&status=active');

		expect(payload.items.map((course: Course) => course.id)).toStrictEqual(['course-001']);
		expect(payload.totalItems).toBe(1);
	});

	it('honours page and pageSize and never returns more than pageSize items', async () => {
		const first = await listing('/api/courses?page=1&pageSize=5');
		const second = await listing('/api/courses?page=2&pageSize=5');

		expect(first.payload.items).toHaveLength(5);
		expect(second.payload.items).toHaveLength(5);
		expect(first.payload.pageSize).toBe(5);
		expect(first.payload.totalPages).toBe(Math.ceil(seededCourseCount / 5));
		expect(new Set([...first.payload.items, ...second.payload.items].map((course: Course) => course.id)).size).toBe(10);
	});

	it('sorts by createdAt', async () => {
		const { payload } = await listing('/api/courses?sort=createdAt&pageSize=50');
		const createdAt = payload.items.map((course: Course) => course.createdAt);

		expect(createdAt).toStrictEqual([...createdAt].sort());
	});

	it('sorts by updatedAt', async () => {
		const { payload } = await listing('/api/courses?sort=updatedAt&pageSize=50');
		const updatedAt = payload.items.map((course: Course) => course.updatedAt);

		expect(updatedAt).toStrictEqual([...updatedAt].sort());
	});

	it('returns 200 with an empty page when nothing matches', async () => {
		const { status, payload } = await listing('/api/courses?q=definitely-not-in-the-catalog');

		expect(status).toBe(200);
		expect(payload.items).toStrictEqual([]);
		expect(payload.totalItems).toBe(0);
		expect(payload.totalPages).toBe(0);
		expect(payload.page).toBe(1);
		expect(payload.pageSize).toBe(10);
	});

	it.each([
		['modality', '/api/courses?modality=remote', 'modality must be one of online, in-person, hybrid.'],
		['status', '/api/courses?status=archived', 'status must be one of draft, active, retired.'],
		['sort', '/api/courses?sort=rating', 'sort must be one of title, createdAt, updatedAt.'],
		['page', '/api/courses?page=0', 'page must be an integer greater than or equal to 1.'],
		['pageSize', '/api/courses?pageSize=51', 'pageSize must be between 1 and 50.'],
	])('returns 400 for an invalid %s', async (field, path, message) => {
		const { status, payload } = await failure(path);

		expect(status).toBe(400);
		expect(payload.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(payload.error.message).toBe('One or more query parameters are invalid.');
		expect(payload.error.details).toStrictEqual([{ field, message }]);
	});

	it('reports every invalid parameter in one 400 response', async () => {
		const { status, payload } = await failure('/api/courses?modality=remote&page=zero');

		expect(status).toBe(400);
		expect(payload.error.details.map((detail) => detail.field)).toStrictEqual(['modality', 'page']);
	});

	it('ignores unrecognised query parameters', async () => {
		const { status, payload } = await listing('/api/courses?unsupported=1');

		expect(status).toBe(200);
		expect(payload.totalItems).toBe(seededCourseCount);
	});
});

describe('GET /health', () => {
	it('still answers after the catalog route was added', async () => {
		const response = await get('/health');

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({ status: 'ok', service: 'agentCourses-api' });
	});
});
