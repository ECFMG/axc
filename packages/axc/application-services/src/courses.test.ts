import { InMemoryCourseRepository } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { searchCourses } from './courses.ts';

const search = searchCourses(new InMemoryCourseRepository());
const ids = async (query: Record<string, string>) => (await search(query)).items.map((c) => c.id);

describe('course search', () => {
	it('defaults to page 1, pageSize 10, sorted by title', async () => {
		const result = await search({});
		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(result.items).toHaveLength(10);
		const titles = result.items.map((c) => c.title);
		expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
		expect(result.items[0]?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('matches q case-insensitively across title, summary and tags', async () => {
		expect(await ids({ q: 'SECURITY' })).toEqual(['course-001', 'course-010', 'course-007', 'course-002']);
		expect(await ids({ q: 'inclusive' })).toEqual(['course-009']);
	});

	it('filters by modality, status, tag and combinations', async () => {
		for (const c of (await search({ modality: 'online', pageSize: '50' })).items) expect(c.modality).toBe('online');
		for (const c of (await search({ status: 'active', pageSize: '50' })).items) expect(c.status).toBe('active');
		expect(await ids({ tag: 'AI' })).toEqual(['course-001', 'course-008', 'course-003']);
		expect(await ids({ q: 'security', modality: 'online', status: 'active' })).toEqual(['course-001']);
	});

	it('paginates and sorts by createdAt', async () => {
		const page2 = await search({ page: '2', pageSize: '5' });
		expect(page2).toMatchObject({ page: 2, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect(page2.items).toHaveLength(5);
		const created = (await search({ sort: 'createdAt', pageSize: '50' })).items.map((c) => c.createdAt);
		expect(created).toEqual([...created].sort());
	});

	it('returns empty items for no matches', async () => {
		expect(await search({ q: 'zzz' })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it.each([{ modality: 'mail' }, { status: 'open' }, { page: '0' }, { page: 'x' }, { pageSize: '51' }, { sort: 'id' }])('rejects %o with INVALID_QUERY_PARAMETER', async (query) => {
		await expect(search(query)).rejects.toMatchObject({ code: 'INVALID_QUERY_PARAMETER', details: [{ field: Object.keys(query)[0] }] });
	});
});
