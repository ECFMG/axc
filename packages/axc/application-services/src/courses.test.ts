import type { Course, CourseReadRepository } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { type CourseSearchInput, createCourseSearch } from './courses.ts';

const courses: Course[] = [
	{ id: 'b', title: 'Security Basics', summary: 'Start here', modality: 'online', status: 'active', tags: ['AI'], createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z' },
	{ id: 'a', title: 'Architecture', summary: 'SECURITY in practice', modality: 'in-person', status: 'draft', tags: ['design'], createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' },
	{ id: 'c', title: 'Cloud', summary: 'Infrastructure', modality: 'hybrid', status: 'retired', tags: ['security', 'ai'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' },
	{ id: 'd', title: 'Security Basics', summary: 'Advanced', modality: 'online', status: 'active', tags: ['ops'], createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z' },
];
const repository: CourseReadRepository = { getAll: () => Promise.resolve(courses) };
const search = createCourseSearch(repository);
const input: CourseSearchInput = { page: 1, pageSize: 10, sort: 'title' };
const ids = (items: readonly Course[]) => items.map((course) => course.id);

describe('course search', () => {
	it('sorts before pagination and preserves the repository order', async () => {
		expect(await search(input)).toEqual({ items: [courses[1], courses[2], courses[0], courses[3]], page: 1, pageSize: 10, totalItems: 4, totalPages: 1 });
		expect(ids(courses)).toEqual(['b', 'a', 'c', 'd']);
	});
	it.each(['SeCuRiTy', 'SECURITY'])('searches title, summary and tags case insensitively: %s', async (q) => {
		expect((await search({ ...input, q })).totalItems).toBe(4);
	});
	it.each(['online', 'in-person', 'hybrid'] as const)('filters modality %s', async (modality) => {
		const result = await search({ ...input, modality });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.modality === modality)).toBe(true);
	});
	it.each(['draft', 'active', 'retired'] as const)('filters status %s', async (status) => {
		const result = await search({ ...input, status });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.status === status)).toBe(true);
	});
	it('matches an entire tag case insensitively', async () => {
		expect(ids((await search({ ...input, tag: 'aI' })).items)).toEqual(['c', 'b']);
		expect((await search({ ...input, tag: 'a' })).items).toEqual([]);
	});
	it('combines keyword, modality and status with AND', async () => {
		expect(ids((await search({ ...input, q: 'security', modality: 'online', status: 'active' })).items)).toEqual(['b', 'd']);
	});
	it('combines tag and status with AND', async () => {
		expect(ids((await search({ ...input, tag: 'AI', status: 'active' })).items)).toEqual(['b']);
		expect((await search({ ...input, modality: 'online', status: 'draft' })).items).toEqual([]);
	});
	it.each([
		['title', ['a', 'c', 'b', 'd']],
		['createdAt', ['c', 'b', 'd', 'a']],
		['updatedAt', ['a', 'c', 'b', 'd']],
	] as const)('sorts %s ascending with id tie breaking', async (sort, expected) => {
		expect(ids((await search({ ...input, sort })).items)).toEqual(expected);
	});
	it.each([
		[1, 1, ['a']],
		[2, 2, ['b', 'd']],
		[2, 3, ['d']],
		[3, 2, []],
		[Number.MAX_SAFE_INTEGER, 50, []],
		[1, 50, ['a', 'c', 'b', 'd']],
	])('paginates page %s size %s', async (page, pageSize, expected) => {
		const result = await search({ ...input, page: page as number, pageSize: pageSize as number });
		expect(ids(result.items)).toEqual(expected);
		expect(result).toMatchObject({ page, pageSize, totalItems: 4, totalPages: Math.ceil(4 / (pageSize as number)) });
	});
	it('returns zero pages when filters match nothing', async () => {
		expect(await search({ ...input, q: 'unmatched' })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
	it('handles an empty repository', async () => {
		expect(await createCourseSearch({ getAll: () => Promise.resolve([]) })(input)).toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
	});
	it('propagates repository failures', async () => {
		await expect(createCourseSearch({ getAll: () => Promise.reject(new Error('storage failed')) })(input)).rejects.toThrow('storage failed');
	});
});
