import { buildApplicationServicesFactory } from '@axc/application-services';
import { Persistence } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { createRestApp } from '../index.ts';

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: Persistence() }));
const get = async (query = '') => {
	const response = await app.request(`/api/courses${query}`);
	return { status: response.status, body: await response.json() };
};
describe('course catalog HTTP contract', () => {
	it('A1 A7 A-AC1 defaults and complete course schema', async () => {
		const { status, body } = await get();
		expect(status).toBe(200);
		expect(body).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(body.items).toHaveLength(10);
		expect(body.items[0]).toEqual({
			id: 'course-001',
			title: 'AI Security Foundations',
			summary: 'Introductory course on secure AI-assisted development.',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-06-12T00:00:00.000Z',
		});
	});
	it('A3 A-AC2 searches title, summary and tags regardless of case', async () => {
		expect((await get('?q=SeCuRiTy')).body.items.map((c: { id: string }) => c.id)).toEqual(['course-001', 'course-002', 'course-003']);
	});
	it.each([
		['modality=online', ['course-001', 'course-004', 'course-002', 'course-007', 'course-011']],
		['status=active', ['course-001', 'course-002', 'course-005', 'course-006', 'course-007', 'course-009', 'course-012']],
		['tag=AI', ['course-001', 'course-004', 'course-012']],
		['q=security&modality=online&status=active', ['course-001', 'course-002']],
		['tag=AI&modality=hybrid&status=active', ['course-012']],
		['modality=in-person&status=retired', ['course-008']],
		['modality=hybrid&status=draft', ['course-003']],
	])('A2 A4 A5 A6 filters %s', async (query, ids) => {
		const { status, body } = await get(`?${query}`);
		expect(status).toBe(200);
		expect(body.items.map((c: { id: string }) => c.id)).toEqual(ids);
		expect(body.totalItems).toBe(ids.length);
	});
	it('A7 A-AC6 paginates after sorting and preserves totals', async () => {
		const first = (await get('?page=1&pageSize=5')).body;
		const second = (await get('?page=2&pageSize=5')).body;
		expect(first).toMatchObject({ page: 1, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect(first.items).toHaveLength(5);
		expect(second.items).toHaveLength(5);
		expect(second.items[0].id).toBe('course-006');
		expect(new Set([...first.items, ...second.items].map((c) => c.id)).size).toBe(10);
		expect((await get('?pageSize=50')).body.items).toHaveLength(12);
		expect((await get('?page=9007199254740991')).body.items).toEqual([]);
	});
	it.each(['title', 'createdAt', 'updatedAt'])('A8 sorts ascending by %s', async (sort) => {
		const { body } = await get(`?sort=${sort}&pageSize=50`);
		expect(body.items).toHaveLength(12);
		const values = body.items.map((c: Record<string, string>) => c[sort]);
		expect(values).toEqual([...values].sort((a, b) => a.localeCompare(b)));
		if (sort === 'updatedAt') expect(body.items[0].id).toBe('course-012');
	});
	it.each([
		'modality=remote',
		'status=unknown',
		'sort=id',
		'page=0',
		'page=-1',
		'page=1.5',
		'page=1e2',
		'page=abc',
		'page=99999999999999999999',
		'pageSize=0',
		'pageSize=51',
		'pageSize=1.5',
		'pageSize=Infinity',
		'page=',
		'pageSize=',
		'q=',
		'q=%20',
		'tag=',
		'modality=',
		'status=',
		'sort=',
		'unknown=x',
		'page=1&page=2',
		'tag=ai&tag=web',
	])('A9 A-AC8 rejects %s', async (query) => {
		const { status, body } = await get(`?${query}`);
		expect(status).toBe(400);
		expect(body.error).toMatchObject({ code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.' });
		expect(body.error.details).toContainEqual({ field: query.split('=')[0], message: expect.any(String) });
	});
	it('collects all validation problems', async () => {
		const { body } = await get('?page=0&pageSize=51&modality=bad');
		expect(body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(['modality', 'page', 'pageSize']);
	});
	it('A-AC9 returns valid empty results', async () => {
		expect(await get('?q=nonexistent')).toEqual({ status: 200, body: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
	});
});
