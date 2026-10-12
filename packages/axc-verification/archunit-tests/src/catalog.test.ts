import { buildApplicationServicesFactory, type CoursePage } from '@axc/application-services';
import type { Course } from '@axc/domain';
import { createFixtureCourseRepository } from '@axc/persistence';
import { createRestApp } from '@axc/rest';
import { describe, expect, it } from 'vitest';

const repository = createFixtureCourseRepository();
const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }, repository));
async function request(query = ''): Promise<CoursePage> {
	const response = await app.request(`/api/courses${query}`);
	expect(response.status).toBe(200);
	expect(response.headers.get('content-type')).toContain('application/json');
	return (await response.json()) as CoursePage;
}

const ids = (courses: readonly Course[]) => courses.map((course) => course.id);

describe('GET /api/courses', () => {
	it('returns the default sorted page with complete course records', async () => {
		const body = await request();
		expect(body).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(body.items).toHaveLength(10);
		expect(body.items.map((c) => c.title)).toEqual(body.items.map((c) => c.title).sort((a, b) => a.localeCompare(b)));
		expect(body.items[0]).toEqual({
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

	it.each([
		['AI SECURITY', ['course-001']],
		['PERSONAL DATA', ['course-003']],
		['QUALITY', ['course-009']],
	])('searches title, summary and tags case-insensitively: %s', async (keyword, expected) => {
		expect(ids((await request(`?q=${encodeURIComponent(keyword)}`)).items)).toEqual(expected);
	});

	it.each(['online', 'in-person', 'hybrid'])('filters modality %s', async (value) => {
		const body = await request(`?modality=${value}`);
		const expected = (await repository.list()).filter((c) => c.modality === value);
		expect(body.totalItems).toBe(expected.length);
		expect(new Set(ids(body.items))).toEqual(new Set(ids(expected)));
	});

	it.each(['draft', 'active', 'retired'])('filters status %s', async (value) => {
		const body = await request(`?status=${value}`);
		expect(body.items.length).toBeGreaterThan(0);
		expect(body.items.every((c) => c.status === value)).toBe(true);
	});

	it('matches tags exactly and case-insensitively', async () => {
		expect(ids((await request('?tag=AI')).items)).toEqual(['course-001', 'course-006']);
		expect((await request('?tag=secur')).items).toEqual([]);
	});

	it.each([
		['?q=SECURITY&modality=online&status=active&tag=AI', ['course-001']],
		['?modality=hybrid&status=retired&tag=Security', ['course-011']],
	])('combines filters with AND: %s', async (query, expected) => {
		expect(ids((await request(query)).items)).toEqual(expected);
	});

	it('paginates after filtering and sorting without overlap', async () => {
		const all = await request('?pageSize=50');
		const first = await request('?pageSize=5');
		const second = await request('?page=2&pageSize=5');
		const last = await request('?page=3&pageSize=5');
		expect(first).toMatchObject({ page: 1, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect(second).toMatchObject({ page: 2, pageSize: 5 });
		expect(last.items).toHaveLength(2);
		expect(ids([...first.items, ...second.items, ...last.items])).toEqual(ids(all.items));
		expect((await request('?page=4&pageSize=5')).items).toEqual([]);
		expect((await request('?modality=online&pageSize=2&page=2')).totalPages).toBe(3);
	});

	it.each(['title', 'createdAt', 'updatedAt'])('sorts ascending by %s with ID tie-breaking', async (sort) => {
		const body = await request(`?sort=${sort}&pageSize=50`);
		const field = sort as 'title' | 'createdAt' | 'updatedAt';
		const expected = [...(await repository.list())].sort((a, b) => a[field].localeCompare(b[field]) || a.id.localeCompare(b.id));
		expect(ids(body.items)).toEqual(ids(expected));
	});

	it('returns valid empty metadata for no matches', async () => {
		expect(await request('?q=nonexistent')).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('treats blank search and tag as absent', async () => {
		expect(await request('?q=%20&tag=')).toEqual(await request());
	});

	it.each([
		['modality', 'remote'],
		['modality', 'ONLINE'],
		['modality', ''],
		['status', 'published'],
		['sort', '-title'],
		['sort', ''],
		['page', '0'],
		['page', '-1'],
		['page', '1.5'],
		['page', 'abc'],
		['page', ''],
		['page', '1e2'],
		['page', '0x10'],
		['page', '9007199254740992'],
		['page', ' 1'],
		['pageSize', '0'],
		['pageSize', '51'],
		['pageSize', '1.5'],
		['pageSize', 'NaN'],
		['pageSize', 'Infinity'],
		['pageSize', ''],
		['unknown', 'x'],
	])('rejects invalid %s=%s', async (field, value) => {
		const response = await app.request(`/api/courses?${field}=${encodeURIComponent(value)}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [{ field, message: expect.any(String) }],
			},
		});
	});

	it.each(['q', 'tag', 'modality', 'status', 'page', 'pageSize', 'sort'])('rejects repeated %s parameters', async (field) => {
		expect((await app.request(`/api/courses?${field}=1&${field}=2`)).status).toBe(400);
	});

	it('reports multiple validation failures together', async () => {
		const response = await app.request('/api/courses?modality=bad&page=0&pageSize=51');
		const body = (await response.json()) as { error: { details: { field: string }[] } };
		expect(response.status).toBe(400);
		expect(body.error.details.map((d) => d.field)).toEqual(['modality', 'page', 'pageSize']);
	});

	it('retains the existing health route', async () => {
		expect((await app.request('/health')).status).toBe(200);
	});
});

describe('catalog storage and application service', () => {
	it('keeps repository snapshots isolated from caller mutation', async () => {
		const first = await repository.list();
		const course = first[0];
		if (!course) throw new Error('Missing course fixture');
		(course.tags as string[]).push('unexpected');
		expect((await repository.list())[0]?.tags).not.toContain('unexpected');
	});

	it('uses the injected repository and breaks equal-title ties by ID', async () => {
		const sample = (await repository.list())[0];
		if (!sample) throw new Error('Missing course fixture');
		const services = await buildApplicationServicesFactory(
			{ environment: 'test' },
			{
				list: () =>
					Promise.resolve([
						{ ...sample, id: 'b' },
						{ ...sample, id: 'a' },
					]),
			},
		).forRequest();
		expect(ids((await services.courses.search({ page: 1, pageSize: 10, sort: 'title' })).items)).toEqual(['a', 'b']);
	});
});
