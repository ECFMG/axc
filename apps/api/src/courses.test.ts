import { readFileSync } from 'node:fs';
import { buildApplicationServicesFactory, type CoursePage } from '@axc/application-services';
import { createRestApp, restHandlerCreator } from '@axc/rest';
import { describe, expect, it } from 'vitest';

const factory = buildApplicationServicesFactory({ environment: 'test' });
const app = createRestApp(factory);
async function list(query = ''): Promise<CoursePage> {
	const response = await app.request(`/api/courses${query}`);
	expect(response.status).toBe(200);
	return (await response.json()) as CoursePage;
}

describe('course catalog endpoint', () => {
	it('returns default pagination and a complete 12-course fixture', async () => {
		const result = await list();
		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(result.items).toHaveLength(10);
		const all = (await list('?pageSize=50')).items;
		expect(new Set(all.map((c) => c.id)).size).toBe(12);
		expect(new Set(all.map((c) => c.modality)).size).toBe(3);
		expect(new Set(all.map((c) => c.status)).size).toBe(3);
		for (const course of all) {
			expect(Object.keys(course).sort()).toEqual(['id', 'title', 'summary', 'modality', 'status', 'tags', 'createdAt', 'updatedAt'].sort());
			expect(new Date(course.createdAt).toISOString()).toBe(course.createdAt);
			expect(new Date(course.updatedAt).toISOString()).toBe(course.updatedAt);
		}
	});
	it.each([
		['?q=AI%20SECURITY', ['course-001']],
		['?q=PERSONAL', ['course-003']],
		['?q=RESEARCH', ['course-005']],
		['?q=SeCuRiTy', ['course-001', 'course-003', 'course-007', 'course-011']],
		['?modality=online&status=active', ['course-001', 'course-004', 'course-007']],
		['?q=security&modality=online&status=active', ['course-001', 'course-007']],
		['?tag=AI&status=draft', ['course-005', 'course-010', 'course-012']],
		['?tag=Ai&q=security&modality=online&status=active', ['course-001']],
	])('matches exact expected courses for %s', async (query, ids) => {
		expect((await list(query)).items.map((c) => c.id).sort()).toEqual([...ids].sort());
	});
	it.each(['online', 'in-person', 'hybrid'])('filters modality %s', async (value) => {
		const result = await list(`?modality=${value}`);
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((c) => c.modality === value)).toBe(true);
	});
	it.each(['draft', 'active', 'retired'])('filters status %s', async (value) => {
		const result = await list(`?status=${value}`);
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((c) => c.status === value)).toBe(true);
	});
	it('matches tags exactly and case-insensitively', async () => {
		expect((await list('?tag=Ai')).totalItems).toBe(4);
		expect((await list('?tag=secur')).totalItems).toBe(0);
	});
	it('paginates after filtering and sorting without overlap', async () => {
		const all = await list('?pageSize=50');
		const first = await list('?page=1&pageSize=5');
		const second = await list('?page=2&pageSize=5');
		expect(first).toMatchObject({ page: 1, pageSize: 5, totalPages: 3, totalItems: 12 });
		expect(first.items).toEqual(all.items.slice(0, 5));
		expect(second.items).toEqual(all.items.slice(5, 10));
		expect((await list('?page=3&pageSize=5')).items).toHaveLength(2);
		expect((await list('?page=99&pageSize=5')).items).toEqual([]);
		expect(await list('?status=draft&page=2&pageSize=2')).toMatchObject({ totalItems: 3, totalPages: 2, items: [expect.any(Object)] });
	});
	it.each(['title', 'createdAt', 'updatedAt'] as const)('sorts ascending by %s', async (sort) => {
		const all = (await list(`?sort=${sort}&pageSize=50`)).items;
		const values = all.map((c) => c[sort]);
		expect(values).toEqual([...values].sort());
	});
	it('returns an empty page for no match', async () => {
		expect(await list('?q=unfindable')).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
	it.each([
		'modality=remote',
		'modality=',
		'status=ACTIVE',
		'status=',
		'sort=id',
		'sort=',
		'page=0',
		'page=-1',
		'page=1.5',
		'page=1e2',
		'page=1x',
		'page=',
		'page=9007199254740992',
		'pageSize=0',
		'pageSize=51',
		'pageSize=-1',
		'pageSize=1.5',
		'pageSize=',
		'pageSize=Infinity',
		'page=1&page=2',
		'q=a&q=b',
		'unknown=value',
	])('rejects invalid query %s with the shared contract', async (query) => {
		const response = await app.request(`/api/courses?${query}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [expect.objectContaining({ field: query.split('=')[0], message: expect.any(String) })] },
		});
	});
	it('collects multiple validation errors', async () => {
		const response = await app.request('/api/courses?status=x&pageSize=99');
		const body = await response.json();
		expect(body.error.details).toHaveLength(2);
	});
	it('does not expose mutable fixture state', async () => {
		const services = await factory.forRequest();
		const query = { page: 1, pageSize: 10, sort: 'title' as const };
		const course = services.courses.search(query).items[0];
		if (!course) throw new Error('Missing fixture');
		course.title = 'changed';
		course.tags.push('changed');
		expect(services.courses.search(query).items.some((c) => c.title === 'changed' || c.tags.includes('changed'))).toBe(false);
	});
	it('serves the Azure adapter URL and registers the same route', async () => {
		const handler = restHandlerCreator(factory);
		const response = await handler({ url: 'http://localhost/api/courses?tag=AI', method: 'GET', headers: new Headers() } as Parameters<typeof handler>[0], {} as Parameters<typeof handler>[1]);
		expect(response?.status).toBe(200);
		const chunks: Uint8Array[] = [];
		for await (const chunk of response?.body as AsyncIterable<Uint8Array>) chunks.push(chunk);
		expect(JSON.parse(Buffer.concat(chunks).toString('utf8')).totalItems).toBe(4);
		expect(readFileSync(new URL('./index.ts', import.meta.url), 'utf8')).toContain("route: 'api/courses'");
	});
	it('preserves the health endpoint', async () => {
		expect((await app.request('/health')).status).toBe(200);
	});
});
