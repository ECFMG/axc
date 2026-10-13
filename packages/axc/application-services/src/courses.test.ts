import type { Course } from '@axc/domain';
import { InMemoryCourseRepository } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { searchCourses } from './courses.ts';

const repo = new InMemoryCourseRepository();
const search = (query: Record<string, string>) => searchCourses(repo, query);
const ids = (items: Course[]) => items.map((c) => c.id);
const fieldsOf = async (query: Record<string, string>) => {
	try {
		await search(query);
	} catch (e) {
		const err = e as { code: string; details: { field: string }[] };
		return { code: err.code, fields: err.details.map((d) => d.field) };
	}
	return undefined;
};

describe('course search', () => {
	it('defaults to page 1, pageSize 10, sorted by title', async () => {
		const result = await search({});
		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(result.items).toHaveLength(10);
		const titles = result.items.map((c) => c.title);
		expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
		expect(Object.keys(result.items[0] ?? {}).sort()).toEqual(['createdAt', 'id', 'modality', 'status', 'summary', 'tags', 'title', 'updatedAt']);
	});

	it('matches q case-insensitively across title, summary and tags', async () => {
		expect(ids((await search({ q: 'SeCuRiTy', pageSize: '50' })).items).sort()).toEqual(['course-001', 'course-002', 'course-005', 'course-012']);
	});

	it('filters by modality, status and tag (case-insensitive tag)', async () => {
		expect((await search({ modality: 'online', pageSize: '50' })).items.every((c) => c.modality === 'online')).toBe(true);
		expect((await search({ status: 'active', pageSize: '50' })).items.every((c) => c.status === 'active')).toBe(true);
		expect(ids((await search({ tag: 'AI' })).items).sort()).toEqual(['course-001', 'course-004', 'course-008']);
	});

	it('combines q, modality and status', async () => {
		expect(ids((await search({ q: 'security', modality: 'online', status: 'active' })).items)).toEqual(['course-001', 'course-002']);
		expect(ids((await search({ tag: 'security', status: 'draft' })).items)).toEqual(['course-012']);
	});

	it('paginates', async () => {
		const page3 = await search({ page: '3', pageSize: '5' });
		expect(page3).toMatchObject({ page: 3, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect(page3.items).toHaveLength(2);
		expect((await search({ pageSize: '50' })).items).toHaveLength(12);
	});

	it('sorts by createdAt and updatedAt', async () => {
		for (const sort of ['createdAt', 'updatedAt'] as const) {
			const values = (await search({ sort, pageSize: '50' })).items.map((c) => c[sort]);
			expect(values).toEqual([...values].sort());
		}
	});

	it('returns an empty page when nothing matches', async () => {
		expect(await search({ q: 'no-such-course' })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it.each([
		[{ modality: 'remote' }, ['modality']],
		[{ status: 'archived' }, ['status']],
		[{ sort: 'price' }, ['sort']],
		[{ page: '0' }, ['page']],
		[{ page: 'abc' }, ['page']],
		[{ pageSize: '51' }, ['pageSize']],
		[{ pageSize: '0' }, ['pageSize']],
		[{ pageSize: '2.5', sort: 'x' }, ['sort', 'pageSize']],
	])('rejects invalid query %j', async (query, fields) => {
		expect(await fieldsOf(query)).toEqual({ code: 'INVALID_QUERY_PARAMETER', fields });
	});
});
