import { describe, expect, it } from 'vitest';
import { COURSE_FIXTURES } from '../../../../fixtures/catalog/course/index.ts';
import { getCourseReadRepository } from './course.read-repository.ts';

const repo = getCourseReadRepository(COURSE_FIXTURES);
const defaults = { page: 1, pageSize: 10, sort: 'title' as const };
describe('course read repository', () => {
	it('provides at least twelve complete and unique fixtures', () => {
		expect(COURSE_FIXTURES.length).toBeGreaterThanOrEqual(12);
		expect(new Set(COURSE_FIXTURES.map((c) => c.id)).size).toBe(COURSE_FIXTURES.length);
		for (const c of COURSE_FIXTURES) {
			expect(c.title.length).toBeGreaterThan(0);
			expect(c.summary.length).toBeGreaterThan(0);
			expect(c.tags.length).toBeGreaterThan(0);
			expect(new Date(c.createdAt).toISOString()).toBe(c.createdAt);
			expect(new Date(c.updatedAt).toISOString()).toBe(c.updatedAt);
		}
	});
	it.each(['title', 'summary', 'tags'] as const)('matches keywords in %s ignoring case', async (field) => {
		const base = COURSE_FIXTURES[0];
		if (base === undefined) {
			throw new Error('Missing course fixture');
		}
		const course = { ...base, title: 'plain', summary: 'plain', tags: ['plain'], [field]: field === 'tags' ? ['SeCuRiTy'] : 'SeCuRiTy' };
		expect((await getCourseReadRepository([course]).search({ ...defaults, q: 'SECURITY' })).items).toEqual([course]);
	});
	it.each(['online', 'in-person', 'hybrid'] as const)('filters modality %s', async (modality) => {
		const result = await repo.search({ ...defaults, modality });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((c) => c.modality === modality)).toBe(true);
	});
	it.each(['draft', 'active', 'retired'] as const)('filters status %s', async (status) => {
		const result = await repo.search({ ...defaults, status });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((c) => c.status === status)).toBe(true);
	});
	it('matches a whole tag ignoring case', async () => {
		const result = await repo.search({ ...defaults, tag: 'AI' });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((c) => c.tags.some((t) => t.toLowerCase() === 'ai'))).toBe(true);
		expect((await repo.search({ ...defaults, tag: 'a' })).items).toEqual([]);
	});
	it('combines all criteria with AND', async () => {
		const result = await repo.search({ ...defaults, q: 'security', modality: 'online', status: 'active', tag: 'AI' });
		expect(result.items.map((c) => c.id)).toEqual(['course-001']);
		expect((await repo.search({ ...defaults, modality: 'hybrid', status: 'retired' })).items.every((c) => c.modality === 'hybrid' && c.status === 'retired')).toBe(true);
	});
	it.each(['title', 'createdAt', 'updatedAt'] as const)('sorts ascending by %s', async (sort) => {
		const result = await repo.search({ ...defaults, pageSize: 50, sort });
		const values = result.items.map((c) => c[sort]);
		expect(values).toEqual([...values].sort((a, b) => a.localeCompare(b)));
	});
	it.each(['title', 'createdAt', 'updatedAt'] as const)('breaks equal %s values by ID without changing fixture order', async (sort) => {
		const base = COURSE_FIXTURES[0];
		if (base === undefined) {
			throw new Error('Missing course fixture');
		}
		const courses = [
			{ ...base, id: 'course-b' },
			{ ...base, id: 'course-a' },
		];
		const result = await getCourseReadRepository(courses).search({ ...defaults, sort });
		expect(result.items.map((course) => course.id)).toEqual(['course-a', 'course-b']);
		expect(courses.map((course) => course.id)).toEqual(['course-b', 'course-a']);
	});
	it('paginates after filtering and sorting and preserves totals', async () => {
		const all = await repo.search({ ...defaults, pageSize: 50 });
		const result = await repo.search({ ...defaults, page: 2, pageSize: 5 });
		expect(result).toEqual({ items: all.items.slice(5, 10), page: 2, pageSize: 5, totalItems: all.items.length, totalPages: Math.ceil(all.items.length / 5) });
		expect((await repo.search({ ...defaults, page: 99 })).items).toEqual([]);
		expect((await repo.search({ ...defaults, page: Number.MAX_SAFE_INTEGER, pageSize: 50 })).items).toEqual([]);
	});
	it('returns zero totals for no matches and empty catalogs', async () => {
		for (const result of [await repo.search({ ...defaults, q: 'nonexistent' }), await getCourseReadRepository([]).search(defaults)]) {
			expect(result).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		}
	});
});
