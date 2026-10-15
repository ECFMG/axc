import type { Course, CourseSearch } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { createCourseService } from './courses.ts';

const courses: Course[] = [
	{ id: 'a', title: 'Security Basics', summary: 'Intro', tags: ['ai'], modality: 'online', status: 'active', createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
	{ id: 'b', title: 'Cloud', summary: 'SECURITY practice', tags: ['cloud'], modality: 'hybrid', status: 'draft', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' },
	{ id: 'c', title: 'AI Operations', summary: 'Intro', tags: ['Security', 'AI'], modality: 'online', status: 'active', createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' },
	{ id: 'd', title: 'Retired', summary: 'Intro', tags: ['legacy'], modality: 'in-person', status: 'retired', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
];
const service = createCourseService({ list: () => Promise.resolve(courses) });
const search = (query: Partial<CourseSearch> = {}) => service.search({ page: 1, pageSize: 10, sort: 'title', ...query });
const ids = (items: Course[]) => items.map((course) => course.id);

describe('course search', () => {
	it('matches keyword independently in title, summary, and tags ignoring case', async () => {
		expect(ids((await search({ q: 'sEcUrItY' })).items)).toEqual(['c', 'b', 'a']);
	});
	it.each(['online', 'in-person', 'hybrid'] as const)('filters modality %s', async (modality) => {
		const result = await search({ modality });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.modality === modality)).toBe(true);
	});
	it.each(['draft', 'active', 'retired'] as const)('filters status %s', async (status) => {
		const result = await search({ status });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.status === status)).toBe(true);
	});
	it('matches complete tags ignoring case', async () => {
		expect(ids((await search({ tag: 'Ai' })).items)).toEqual(['c', 'a']);
		expect((await search({ tag: 'secur' })).items).toEqual([]);
	});
	it('intersects keyword, modality, and status', async () => {
		expect(ids((await search({ q: 'security', modality: 'online', status: 'active' })).items)).toEqual(['c', 'a']);
	});
	it('intersects status and tag', async () => {
		expect(ids((await search({ status: 'draft', tag: 'cloud' })).items)).toEqual(['b']);
	});
	it('paginates after sorting and counts all matches', async () => {
		expect(await search({ page: 2, pageSize: 2 })).toEqual({ items: [courses[3], courses[0]], page: 2, pageSize: 2, totalItems: 4, totalPages: 2 });
	});
	it.each([
		['title', ['c', 'b', 'd', 'a']],
		['createdAt', ['d', 'b', 'c', 'a']],
		['updatedAt', ['d', 'a', 'c', 'b']],
	] as const)('sorts %s ascending', async (sort, expected) => {
		expect(ids((await search({ sort })).items)).toEqual(expected);
	});
	it('breaks sort ties by id without mutating catalog order', async () => {
		const tied = createCourseService({ list: () => Promise.resolve([...courses].reverse().map((course) => ({ ...course, title: 'Same' }))) });
		expect(ids((await tied.search({ page: 1, pageSize: 10, sort: 'title' })).items)).toEqual(['a', 'b', 'c', 'd']);
		expect(ids(courses)).toEqual(['a', 'b', 'c', 'd']);
	});
	it('returns zero totals for no matches and preserves totals beyond the last page', async () => {
		expect(await search({ q: 'absent' })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		expect(await search({ page: 100 })).toEqual({ items: [], page: 100, pageSize: 10, totalItems: 4, totalPages: 1 });
	});
	it('propagates catalog failures', async () => {
		const failing = createCourseService({ list: () => Promise.reject(new Error('Unavailable')) });
		await expect(failing.search({ page: 1, pageSize: 10, sort: 'title' })).rejects.toThrow('Unavailable');
	});
});
