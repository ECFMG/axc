import { describe, expect, it } from 'vitest';
import { buildCourseService, type CourseSearchResult } from './courses.ts';

const service = buildCourseService();
const ok = async (query: Record<string, string>): Promise<CourseSearchResult> => {
	const outcome = await service.search(query);
	if (!outcome.ok) throw new Error(JSON.stringify(outcome.details));
	return outcome.result;
};
const fields = async (query: Record<string, string>) => (await service.search(query)).ok === false && ((await service.search(query)) as { details: { field: string }[] }).details.map((d) => d.field);

describe('course search', () => {
	it('defaults to page 1, pageSize 10, sorted by title', async () => {
		const r = await ok({});
		expect(r).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(r.items).toHaveLength(10);
		const titles = r.items.map((c) => c.title);
		expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
	});
	it('keyword search spans title, summary, tags case-insensitively', async () => {
		const ids = (await ok({ q: 'SECURITY' })).items.map((c) => c.id).sort();
		expect(ids).toEqual(['course-001', 'course-005', 'course-008']);
	});
	it('filters by modality, status, tag', async () => {
		expect((await ok({ modality: 'online' })).items.every((c) => c.modality === 'online')).toBe(true);
		expect((await ok({ status: 'active' })).items.every((c) => c.status === 'active')).toBe(true);
		expect((await ok({ tag: 'ai' })).items.map((c) => c.id).sort()).toEqual(['course-001', 'course-004', 'course-009']);
	});
	it('combines q, modality, status', async () => {
		expect((await ok({ q: 'ai', modality: 'online', status: 'active' })).items.map((c) => c.id)).toEqual(['course-001']);
		expect((await ok({ modality: 'hybrid', status: 'draft' })).items.map((c) => c.id).sort()).toEqual(['course-007', 'course-012']);
	});
	it('paginates', async () => {
		const p3 = await ok({ page: '3', pageSize: '5' });
		expect(p3).toMatchObject({ page: 3, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect(p3.items).toHaveLength(2);
		expect((await ok({ pageSize: '50' })).items).toHaveLength(12);
	});
	it('sorts by createdAt and updatedAt', async () => {
		for (const sort of ['createdAt', 'updatedAt'] as const) {
			const values = (await ok({ sort, pageSize: '50' })).items.map((c) => c[sort]);
			expect(values).toEqual([...values].sort());
		}
	});
	it('returns empty items for no matches', async () => {
		expect(await ok({ q: 'zzz-nothing' })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
	it('rejects invalid parameters with field details', async () => {
		expect(await fields({ modality: 'remote' })).toEqual(['modality']);
		expect(await fields({ status: 'archived' })).toEqual(['status']);
		expect(await fields({ page: '0' })).toEqual(['page']);
		expect(await fields({ page: 'abc' })).toEqual(['page']);
		expect(await fields({ pageSize: '51' })).toEqual(['pageSize']);
		expect(await fields({ sort: 'price' })).toEqual(['sort']);
		expect(await fields({ foo: '1' })).toEqual(['foo']);
	});
});
