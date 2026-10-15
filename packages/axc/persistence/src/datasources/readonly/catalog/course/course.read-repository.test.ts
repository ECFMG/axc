import { Domain } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { COURSE_FIXTURES } from '../../../../fixtures/courses.ts';
import { DataSourcesFactoryImpl } from '../../../index.ts';
import { getCourseReadRepository } from './course.read-repository.ts';

type Course = Domain.Contexts.Catalog.Course.Course;
const courses: Course[] = [
	{ id: 'c', title: 'Security Basics', summary: 'Introduction', modality: 'online', status: 'active', tags: ['AI'], createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
	{ id: 'a', title: 'Alpha', summary: 'SECURITY workshop', modality: 'in-person', status: 'draft', tags: ['cloud'], createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-03-01T00:00:00.000Z' },
	{ id: 'b', title: 'Beta', summary: 'Foundations', modality: 'hybrid', status: 'retired', tags: ['Security', 'ai'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' },
];
const criteria = { page: 1, pageSize: 10, sort: 'title' as const };
const repo = getCourseReadRepository(courses);

describe('course read repository', () => {
	it('sorts before paging and counts before paging', async () => {
		expect(await repo.search({ ...criteria, page: 2, pageSize: 1 })).toEqual({ items: [courses[2]], page: 2, pageSize: 1, totalItems: 3, totalPages: 3 });
		expect(courses.map((course) => course.id)).toEqual(['c', 'a', 'b']);
	});
	it.each(['security', 'SECURITY', 'SeCuRiTy'])('searches title, summary and tags for %s', async (q) => {
		expect((await repo.search({ ...criteria, q })).totalItems).toBe(3);
	});
	it.each(Domain.Contexts.Catalog.Course.COURSE_MODALITIES)('filters modality %s', async (modality) => {
		const result = await repo.search({ ...criteria, modality });
		expect(result.items).toEqual(courses.filter((course) => course.modality === modality));
	});
	it.each(Domain.Contexts.Catalog.Course.COURSE_STATUSES)('filters status %s', async (status) => {
		expect((await repo.search({ ...criteria, status })).items).toEqual(courses.filter((course) => course.status === status));
	});
	it.each(['ai', 'AI', 'Ai'])('matches whole tags case insensitively: %s', async (tag) => {
		expect((await repo.search({ ...criteria, tag })).items.map((course) => course.id)).toEqual(['b', 'c']);
	});
	it('does not match partial tags', async () => {
		expect((await repo.search({ ...criteria, tag: 'secur' })).items).toEqual([]);
	});
	it('combines q, modality and status with AND', async () => {
		expect((await repo.search({ ...criteria, q: 'security', modality: 'online', status: 'active' })).items).toEqual([courses[0]]);
	});
	it('combines status and tag with AND', async () => {
		expect((await repo.search({ ...criteria, status: 'retired', tag: 'AI' })).items).toEqual([courses[2]]);
		expect((await repo.search({ ...criteria, modality: 'online', status: 'draft' })).items).toEqual([]);
	});
	it.each([
		['title', ['a', 'b', 'c']],
		['createdAt', ['b', 'a', 'c']],
		['updatedAt', ['c', 'b', 'a']],
	] as const)('sorts %s ascending', async (sort, ids) => {
		expect((await repo.search({ ...criteria, sort })).items.map((course) => course.id)).toEqual(ids);
	});
	it('breaks equal sort values by id', async () => {
		const tied = getCourseReadRepository(courses.map((course) => ({ ...course, title: 'Same' })));
		expect((await tied.search(criteria)).items.map((course) => course.id)).toEqual(['a', 'b', 'c']);
	});
	it('returns a final partial page and an out of range page', async () => {
		expect(await repo.search({ ...criteria, page: 2, pageSize: 2 })).toMatchObject({ items: [courses[0]], totalPages: 2 });
		expect(await repo.search({ ...criteria, page: 4, pageSize: 1 })).toMatchObject({ items: [], page: 4, totalItems: 3, totalPages: 3 });
	});
	it('handles page size limits and very large valid pages', async () => {
		expect((await repo.search({ ...criteria, pageSize: 50 })).items).toHaveLength(3);
		expect((await repo.search({ ...criteria, page: Number.MAX_SAFE_INTEGER })).items).toEqual([]);
	});
	it('returns zero pages when no courses match or the source is empty', async () => {
		expect(await repo.search({ ...criteria, q: 'absent' })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		expect((await getCourseReadRepository([]).search(criteria)).totalPages).toBe(0);
	});
	it('wires the factory with the supplied catalog', async () => {
		const dataSources = DataSourcesFactoryImpl(courses).forRequest();
		expect((await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(criteria)).totalItems).toBe(3);
	});
	it('provides at least twelve complete, unique fixtures with every modality and status', () => {
		expect(COURSE_FIXTURES.length).toBeGreaterThanOrEqual(12);
		expect(new Set(COURSE_FIXTURES.map((course) => course.id)).size).toBe(COURSE_FIXTURES.length);
		expect(new Set(COURSE_FIXTURES.map((course) => course.modality))).toEqual(new Set(['online', 'in-person', 'hybrid']));
		expect(new Set(COURSE_FIXTURES.map((course) => course.status))).toEqual(new Set(['draft', 'active', 'retired']));
		for (const course of COURSE_FIXTURES) {
			expect(course.title.length).toBeGreaterThan(0);
			expect(course.summary.length).toBeGreaterThan(0);
			expect(course.tags.length).toBeGreaterThan(0);
			expect(new Date(course.createdAt).toISOString()).toBe(course.createdAt);
			expect(new Date(course.updatedAt).toISOString()).toBe(course.updatedAt);
		}
	});
});
