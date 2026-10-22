import { buildApplicationServicesFactory } from '@axc/application-services';
import { Persistence } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { createRestApp } from '../index.ts';

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: Persistence() }));
const search = async (query = '') => {
	const response = await app.request(`/api/courses${query}`);
	return { response, data: await response.json() };
};
describe('A1-A10 B1 course search', () => {
	it('A-AC1 A-AC6 defaults and twelve complete fixtures', async () => {
		const { response, data } = await search();
		expect(response.status).toBe(200);
		expect(data).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(data.items).toHaveLength(10);
		const all = (await search('?pageSize=50')).data.items;
		expect(new Set(all.map((c: { id: string }) => c.id)).size).toBe(12);
		for (const item of all) {
			expect(item).toEqual({
				id: expect.any(String),
				title: expect.any(String),
				summary: expect.any(String),
				modality: expect.stringMatching(/^(online|in-person|hybrid)$/),
				status: expect.stringMatching(/^(active|draft|retired)$/),
				tags: expect.any(Array),
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
		}
	});
	it.each([
		['SECURITY', ['course-001', 'course-003', 'course-007']],
		['ASSISTED', ['course-001']],
		['maintenance', ['course-005']],
	])('A-AC2 keyword %s searches title summary and tags', async (q, ids) => {
		expect((await search(`?q=${q}`)).data.items.map((c: { id: string }) => c.id).sort()).toEqual(ids);
	});
	it.each([
		['modality=online', 5],
		['status=active', 8],
		['tag=AI', 3],
		['q=security&modality=online&status=active', 1],
		['tag=AI&status=active', 2],
	])('A-AC3 A-AC4 A-AC5 combined filters %s', async (query, count) => {
		const { data } = await search(`?${query}&pageSize=50`);
		expect(data.items).toHaveLength(count);
		expect(data.totalItems).toBe(count);
	});
	it('A-AC6 pagination changes the result slice', async () => {
		const all = (await search('?pageSize=50')).data.items;
		for (const page of [1, 2, 3]) {
			const { data } = await search(`?page=${page}&pageSize=5`);
			expect(data).toMatchObject({ page, pageSize: 5, totalItems: 12, totalPages: 3 });
			expect(data.items).toEqual(all.slice((page - 1) * 5, page * 5));
		}
	});
	it.each(['title', 'createdAt', 'updatedAt'])('A-AC7 sorts by %s', async (sort) => {
		const items = (await search(`?sort=${sort}&pageSize=50`)).data.items;
		const values = items.map((c: Record<string, string>) => c[sort]);
		expect(values).toHaveLength(12);
		expect(values).toEqual([...values].sort((a: string, b: string) => a.localeCompare(b)));
	});
	it.each([
		'modality=remote',
		'status=bad',
		'sort=bad',
		'page=0',
		'page=-1',
		'page=1.5',
		'page=1e2',
		'page=99999999999999999999',
		'pageSize=51',
		'pageSize=0',
		'pageSize=Infinity',
		'q=',
		'tag=',
		'status=',
		'page=',
		'page=1&page=2',
		'unknown=x',
	])('A-AC8 rejects %s', async (query) => {
		const { response, data } = await search(`?${query}`);
		expect(response.status).toBe(400);
		expect(data.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(data.error.details.length).toBeGreaterThan(0);
	});
	it('A-AC9 no matches or out of range pages are successful empty lists', async () => {
		expect((await search('?q=nonexistent')).data).toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
		expect((await search('?page=999')).data.items).toEqual([]);
	});
});
