import { buildApplicationServicesFactory } from '@axc/application-services';
import { Persistence } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { createRestApp } from '../index.ts';

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: Persistence() }));
const get = async (query = '') => {
	const response = await app.request(`/api/courses${query}`);
	return { status: response.status, body: await response.json() };
};
describe('courses HTTP contract', () => {
	it('A-AC1 returns twelve complete fixtures with default pagination and title order', async () => {
		const { status, body } = await get();
		expect(status).toBe(200);
		expect(body).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(body.items).toHaveLength(10);
		expect(body.items[0]).toEqual({
			id: 'course-001',
			title: 'AI Security Foundations',
			summary: 'Secure AI-assisted development.',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: '2025-12-15T00:00:00.000Z',
			updatedAt: '2026-01-20T00:00:00.000Z',
		});
		const titles = body.items.map((c: { title: string }) => c.title);
		expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
	});
	it('A-AC2 finds title, summary and tags case-insensitively', async () => {
		const { body } = await get('?q=SeCuRiTy');
		expect(body.items.map((c: { id: string }) => c.id)).toEqual(['course-001', 'course-002', 'course-003', 'course-012']);
	});
	it.each([
		['modality=online', ['course-001', 'course-005', 'course-002', 'course-008', 'course-011']],
		['status=active', ['course-001', 'course-004', 'course-002', 'course-006', 'course-008', 'course-009', 'course-012']],
		['tag=AI', ['course-001', 'course-008', 'course-012']],
		['q=security&modality=online&status=active', ['course-001', 'course-002']],
		['tag=ai&modality=in-person&status=active', ['course-012']],
		['modality=hybrid&status=draft', ['course-003']],
		['modality=online&status=retired', ['course-011']],
	])('A-AC3/4/5/11 filters %s', async (query, ids) => {
		const { status, body } = await get(`?${query}`);
		expect(status).toBe(200);
		expect(body.items.map((c: { id: string }) => c.id)).toEqual(ids);
	});
	it('A-AC6 pages after filtering and sorting', async () => {
		const first = (await get('?page=1&pageSize=5')).body;
		const second = (await get('?page=2&pageSize=5')).body;
		expect(first).toMatchObject({ page: 1, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect(first.items).toHaveLength(5);
		expect(second.items).toHaveLength(5);
		expect(second.items[0].id).toBe('course-003');
		expect((await get('?page=3&pageSize=5')).body.items).toHaveLength(2);
		expect((await get('?page=4&pageSize=5')).body.items).toEqual([]);
		expect((await get('?pageSize=50')).body.items).toHaveLength(12);
	});
	it.each([
		['createdAt', 'course-012'],
		['updatedAt', 'course-001'],
	])('A-AC7 sorts ascending by %s', async (sort, id) => {
		const { body } = await get(`?sort=${sort}&pageSize=50`);
		expect(body.items[0].id).toBe(id);
		const values = body.items.map((c: Record<string, string>) => c[sort]);
		expect(values).toEqual([...values].sort());
	});
	it.each([
		'modality=remote',
		'status=published',
		'sort=id',
		'page=0',
		'page=-1',
		'page=1.5',
		'page=1e2',
		'page=999999999999999999999',
		'pageSize=0',
		'pageSize=51',
		'pageSize=Infinity',
		'pageSize=2.5',
		'page=',
		'pageSize=',
		'modality=',
		'status=',
		'sort=',
		'q=',
		'tag=%20',
		'q=a&q=b',
		'page=1&page=2',
		'unknown=x',
	])('A-AC8 rejects %s', async (query) => {
		const { status, body } = await get(`?${query}`);
		expect(status).toBe(400);
		expect(body.error).toMatchObject({ code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.' });
		expect(body.error.details).toEqual([expect.objectContaining({ field: query.split('=')[0], message: expect.any(String) })]);
	});
	it('collects all invalid fields', async () => {
		expect((await get('?page=0&status=bad&pageSize=51')).body.error.details.map((d: { field: string }) => d.field)).toEqual(['page', 'status', 'pageSize']);
	});
	it('A-AC9 returns empty results with metadata', async () => {
		expect(await get('?q=nonexistent')).toEqual({ status: 200, body: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
	});
});
