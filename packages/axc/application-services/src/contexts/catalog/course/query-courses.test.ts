import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { describe, expect, it, vi } from 'vitest';
import { queryCourses } from './query-courses.ts';

type Course = Domain.Contexts.Catalog.Course.Course;
type Query = Domain.Contexts.Catalog.Course.CourseQuery;
const courses: Course[] = [
	{ id: 'b', title: 'Security Basics', summary: 'Start here', tags: ['ai'], modality: 'online', status: 'active', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z' },
	{ id: 'a', title: 'Architecture', summary: 'SECURITY review', tags: ['design'], modality: 'hybrid', status: 'draft', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
	{ id: 'c', title: 'Cloud', summary: 'Deploy apps', tags: ['SeCuRiTy', 'AI'], modality: 'in-person', status: 'retired', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z' },
	{ id: 'd', title: 'Tools', summary: 'Build apps', tags: ['aid'], modality: 'online', status: 'draft', createdAt: '2026-04-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
];
const defaults: Query = { page: 1, pageSize: 10, sort: 'title' };
function setup(items = courses) {
	const getAll = vi.fn().mockResolvedValue(items);
	const dataSources: DataSources = { readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { getAll } } } } };
	return { run: queryCourses(dataSources), getAll };
}
describe('query courses', () => {
	it('sorts before pagination and counts the complete match set', async () => {
		const { run, getAll } = setup();
		expect(await run(defaults)).toEqual({ items: [courses[1], courses[2], courses[0], courses[3]], page: 1, pageSize: 10, totalItems: 4, totalPages: 1 });
		expect(getAll).toHaveBeenCalledOnce();
	});
	it('matches keyword in title, summary and tags without case sensitivity', async () => {
		expect((await setup().run({ ...defaults, q: 'sEcUrItY' })).items.map((course) => course.id)).toEqual(['a', 'c', 'b']);
		expect((await setup().run({ ...defaults, q: 'ecur' })).totalItems).toBe(3);
	});
	it.each(['online', 'in-person', 'hybrid'] as const)('filters modality %s', async (modality) => {
		const result = await setup().run({ ...defaults, modality });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.modality === modality)).toBe(true);
	});
	it.each(['draft', 'active', 'retired'] as const)('filters status %s', async (status) => {
		const result = await setup().run({ ...defaults, status });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.status === status)).toBe(true);
	});
	it('matches whole tags case insensitively', async () => {
		expect((await setup().run({ ...defaults, tag: 'Ai' })).items.map((course) => course.id)).toEqual(['c', 'b']);
	});
	it('combines keyword, modality and status using AND', async () => {
		expect((await setup().run({ ...defaults, q: 'security', modality: 'online', status: 'active' })).items).toEqual([courses[0]]);
	});
	it('combines tag, modality and status using AND', async () => {
		expect((await setup().run({ ...defaults, tag: 'AI', modality: 'in-person', status: 'retired' })).items).toEqual([courses[2]]);
	});
	it.each([
		['title', ['a', 'c', 'b', 'd']],
		['createdAt', ['a', 'c', 'b', 'd']],
		['updatedAt', ['b', 'c', 'a', 'd']],
	] as const)('sorts ascending by %s', async (sort, ids) => {
		expect((await setup().run({ ...defaults, sort })).items.map((course) => course.id)).toEqual(ids);
	});
	it.each(['title', 'createdAt', 'updatedAt'] as const)('breaks %s ties by id without mutating repository data', async (sort) => {
		const first = courses[0];
		if (!first) throw new Error('Missing fixture');
		const items = [
			{ ...first, id: 'z' },
			{ ...first, id: 'a' },
		];
		expect((await setup(items).run({ ...defaults, sort })).items.map((course) => course.id)).toEqual(['a', 'z']);
		expect(items.map((course) => course.id)).toEqual(['z', 'a']);
	});
	it('returns the requested page, final partial page and out-of-range empty page', async () => {
		const { run } = setup();
		expect(await run({ ...defaults, page: 2, pageSize: 3 })).toEqual({ items: [courses[3]], page: 2, pageSize: 3, totalItems: 4, totalPages: 2 });
		expect((await run({ ...defaults, pageSize: 1 })).items).toEqual([courses[1]]);
		expect((await run({ ...defaults, pageSize: 50 })).items).toHaveLength(4);
		expect(await run({ ...defaults, page: Number.MAX_SAFE_INTEGER, pageSize: 50 })).toMatchObject({ items: [], totalItems: 4, totalPages: 1 });
	});
	it.each([{ q: 'missing' }, { modality: 'hybrid', status: 'active' }, { tag: 'missing' }] as const)('returns zero totals for no matches %j', async (filters) => {
		expect(await setup().run({ ...defaults, ...filters })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
	it('supports an empty catalog and propagates repository failures', async () => {
		expect((await setup([]).run(defaults)).totalItems).toBe(0);
		const { run, getAll } = setup();
		getAll.mockRejectedValue(new Error('Unavailable'));
		await expect(run(defaults)).rejects.toThrow('Unavailable');
	});
});
