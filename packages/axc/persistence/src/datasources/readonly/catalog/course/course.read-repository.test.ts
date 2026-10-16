import type { Domain } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { getCourseReadRepository } from './course.read-repository.ts';

type Course = Domain.Contexts.Catalog.Course.Course;
const courses: Course[] = [
	{ id: 'c', title: 'SECURITY', summary: 'title match', modality: 'online', status: 'active', tags: ['AI'], createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
	{ id: 'a', title: 'Alpha', summary: 'Security summary', modality: 'in-person', status: 'draft', tags: ['data'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' },
	{ id: 'b', title: 'Beta', summary: 'tag match', modality: 'hybrid', status: 'retired', tags: ['security'], createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' },
];
const defaults = { page: 1, pageSize: 10, sort: 'title' } as const;
const repo = getCourseReadRepository(courses);
describe('course search repository', () => {
	it('searches title, summary and tags without case sensitivity', async () => {
		expect((await repo.search({ ...defaults, q: 'sEcUrItY' })).items.map((c) => c.id)).toEqual(['a', 'b', 'c']);
	});
	it.each(['online', 'in-person', 'hybrid'] as const)('filters modality %s', async (modality) => {
		const result = await repo.search({ ...defaults, modality });
		expect(result.items).toEqual(courses.filter((c) => c.modality === modality));
	});
	it.each(['draft', 'active', 'retired'] as const)('filters status %s', async (status) => {
		expect((await repo.search({ ...defaults, status })).items).toEqual(courses.filter((c) => c.status === status));
	});
	it('matches whole tags case insensitively', async () => {
		expect((await repo.search({ ...defaults, tag: 'ai' })).items).toEqual([courses[0]]);
		expect((await repo.search({ ...defaults, tag: 'sec' })).items).toEqual([]);
	});
	it('intersects all criteria and rejects individual mismatches', async () => {
		const criteria = { ...defaults, q: 'security', modality: 'online', status: 'active', tag: 'ai' } as const;
		expect((await repo.search(criteria)).items).toEqual([courses[0]]);
		for (const mismatch of [{ q: 'absent' }, { modality: 'hybrid' }, { status: 'draft' }, { tag: 'data' }] as const) {
			expect((await repo.search({ ...criteria, ...mismatch })).items).toEqual([]);
		}
	});
	it.each([
		['title', ['a', 'b', 'c']],
		['createdAt', ['a', 'b', 'c']],
		['updatedAt', ['c', 'b', 'a']],
	] as const)('sorts %s ascending before paging', async (sort, ids) => {
		const result = await repo.search({ page: 2, pageSize: 1, sort });
		expect(result).toEqual({ items: [courses.find((c) => c.id === ids[1])], page: 2, pageSize: 1, totalItems: 3, totalPages: 3 });
	});
	it('returns empty pages and no matches with accurate totals', async () => {
		expect(await repo.search({ ...defaults, page: 10 })).toMatchObject({ items: [], totalItems: 3, totalPages: 1 });
		expect(await repo.search({ ...defaults, q: 'absent' })).toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
		expect(await getCourseReadRepository([]).search(defaults)).toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
	});
	it('breaks sort ties by id without mutating the source', async () => {
		const tied = courses.map((c) => ({ ...c, title: 'Same' }));
		expect((await getCourseReadRepository(tied).search(defaults)).items.map((c) => c.id)).toEqual(['a', 'b', 'c']);
		expect(tied.map((c) => c.id)).toEqual(['c', 'a', 'b']);
	});
});
