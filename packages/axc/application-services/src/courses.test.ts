import { InMemoryCourseRepository } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { searchCourses } from './courses.ts';

const search = async (query: Record<string, string>) => {
	const result = await searchCourses(new InMemoryCourseRepository(), query);
	if (!result.ok) throw new Error(JSON.stringify(result.value));
	return result.value;
};
const fail = async (query: Record<string, string>) => {
	const result = await searchCourses(new InMemoryCourseRepository(), query);
	if (result.ok) throw new Error('expected failure');
	return result.value.error;
};

describe('searchCourses', () => {
	it('defaults to page 1, pageSize 10, sorted by title', async () => {
		const r = await search({});
		expect([r.page, r.pageSize, r.totalItems, r.totalPages, r.items.length]).toEqual([1, 10, 12, 2, 10]);
		const titles = r.items.map((c) => c.title);
		expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
	});
	it('q matches title, summary and tags case-insensitively', async () => {
		const ids = (await search({ q: 'SeCuRiTy' })).items.map((c) => c.id).sort();
		expect(ids).toEqual(['course-001', 'course-005', 'course-009']);
	});
	it('filters by modality, status and tag (case-insensitive)', async () => {
		expect((await search({ modality: 'online' })).items.every((c) => c.modality === 'online')).toBe(true);
		expect((await search({ status: 'active' })).items.every((c) => c.status === 'active')).toBe(true);
		expect((await search({ tag: 'AI' })).items.map((c) => c.id).sort()).toEqual(['course-001', 'course-004', 'course-011']);
	});
	it('combines q, modality and status', async () => {
		expect((await search({ q: 'ai', modality: 'online', status: 'active' })).items.map((c) => c.id).sort()).toEqual(['course-001', 'course-011']);
	});
	it('paginates', async () => {
		const p3 = await search({ page: '3', pageSize: '5' });
		expect([p3.items.length, p3.totalPages, p3.totalItems]).toEqual([2, 3, 12]);
		expect((await search({ pageSize: '50' })).items).toHaveLength(12);
	});
	it('sorts by createdAt and updatedAt', async () => {
		for (const sort of ['createdAt', 'updatedAt'] as const) {
			const values = (await search({ sort, pageSize: '50' })).items.map((c) => c[sort]);
			expect(values).toEqual([...values].sort());
		}
	});
	it('returns empty items for no matches', async () => {
		expect(await search({ q: 'zzz-nothing' })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
	it.each([{ modality: 'remote' }, { status: 'archived' }, { page: '0' }, { page: 'abc' }, { pageSize: '51' }, { pageSize: '0' }, { sort: 'id' }, { foo: '1' }])('rejects %o', async (query) => {
		const error = await fail(query);
		expect(error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(error.details[0]?.field).toBe(Object.keys(query)[0]);
	});
	it('is exposed through the application services factory', async () => {
		const { buildApplicationServicesFactory } = await import('./index.ts');
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		expect((await services.courses.search({})).ok).toBe(true);
	});
});
