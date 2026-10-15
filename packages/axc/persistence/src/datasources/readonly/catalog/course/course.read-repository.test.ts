import type { Domain } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { COURSE_FIXTURES } from '../../../../fixtures/catalog/course/index.ts';
import { DataSourcesFactoryImpl } from '../../../index.ts';
import { getCourseReadRepository } from './course.read-repository.ts';

type Criteria = Domain.Contexts.Catalog.Course.CourseSearchCriteria;
const defaults: Criteria = { page: 1, pageSize: 10, sort: 'title' };
const repo = getCourseReadRepository(COURSE_FIXTURES);
const search = (criteria: Partial<Criteria> = {}) => repo.search({ ...defaults, ...criteria });

describe('course read repository', () => {
	it('has at least twelve complete unique fixtures with all modalities and statuses', () => {
		expect(COURSE_FIXTURES.length).toBeGreaterThanOrEqual(12);
		expect(new Set(COURSE_FIXTURES.map((course) => course.id)).size).toBe(COURSE_FIXTURES.length);
		for (const course of COURSE_FIXTURES) {
			expect(course).toEqual({
				id: expect.any(String),
				title: expect.any(String),
				summary: expect.any(String),
				modality: expect.any(String),
				status: expect.any(String),
				tags: expect.any(Array),
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
			});
			expect(new Date(course.createdAt).toISOString()).toBe(course.createdAt);
			expect(new Date(course.updatedAt).toISOString()).toBe(course.updatedAt);
		}
		expect(new Set(COURSE_FIXTURES.map((course) => course.modality))).toEqual(new Set(['online', 'in-person', 'hybrid']));
		expect(new Set(COURSE_FIXTURES.map((course) => course.status))).toEqual(new Set(['active', 'draft', 'retired']));
	});
	it('wires required fixture data through the factory', async () => {
		const sources = DataSourcesFactoryImpl(COURSE_FIXTURES).create();
		expect(await sources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(defaults)).toEqual(await search());
	});
	it('sorts and pages after counting all matches without mutating fixtures', async () => {
		const before = structuredClone(COURSE_FIXTURES);
		const all = await search({ pageSize: 50 });
		const first = await search({ pageSize: 5 });
		const second = await search({ page: 2, pageSize: 5 });
		expect(first.items).toEqual(all.items.slice(0, 5));
		expect(second.items).toEqual(all.items.slice(5, 10));
		expect(first.totalItems).toBe(COURSE_FIXTURES.length);
		expect((await search()).items).toHaveLength(10);
		expect(COURSE_FIXTURES).toEqual(before);
	});
	it.each(['title', 'summary', 'tags'] as const)('matches keywords in %s regardless of case', async (field) => {
		const base = COURSE_FIXTURES[0];
		if (base === undefined) {
			throw new Error('Course fixture is required');
		}
		const course = { ...base, title: 'Other', summary: 'Other', tags: ['other'], [field]: field === 'tags' ? ['SeCuRiTy'] : 'Learn SeCuRiTy now' };
		const result = await getCourseReadRepository([course]).search({ ...defaults, q: 'SECURITY' });
		expect(result.items).toEqual([course]);
	});
	it.each(['online', 'in-person', 'hybrid'] as const)('filters modality %s', async (modality) => {
		const result = await search({ modality, pageSize: 50 });
		expect(result.items).toEqual(COURSE_FIXTURES.filter((course) => course.modality === modality).sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id)));
	});
	it.each(['draft', 'active', 'retired'] as const)('filters status %s', async (status) => {
		const result = await search({ status });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.status === status)).toBe(true);
	});
	it('matches exact tags case-insensitively, not substrings', async () => {
		const result = await search({ tag: 'AI' });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.tags.some((tag) => tag.toLowerCase() === 'ai'))).toBe(true);
		expect((await search({ tag: 'secur' })).items).toEqual([]);
	});
	it.each([
		{ q: 'SECURITY', modality: 'online', status: 'active' },
		{ tag: 'AI', modality: 'hybrid' },
	] as const)('intersects filters %j', async (criteria) => {
		const result = await search(criteria);
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => criteria.modality === course.modality)).toBe(true);
		if ('status' in criteria) {
			expect(result.items.every((course) => course.status === criteria.status && [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes('security')))).toBe(true);
		} else {
			expect(result.items.every((course) => course.tags.includes('ai'))).toBe(true);
		}
	});
	it.each(['title', 'createdAt', 'updatedAt'] as const)('sorts %s ascending with deterministic id ties', async (sort) => {
		const base = COURSE_FIXTURES[0];
		if (base === undefined) {
			throw new Error('Course fixture is required');
		}
		const rows = [
			{ ...base, id: 'b', [sort]: 'b' },
			{ ...base, id: 'z', [sort]: 'a' },
			{ ...base, id: 'a', [sort]: 'a' },
		];
		const result = await getCourseReadRepository(rows).search({ ...defaults, sort });
		expect(result.items.map((course) => course.id)).toEqual(['a', 'z', 'b']);
	});
	it('returns empty results for no matches, empty data and out-of-range pages', async () => {
		expect(await search({ q: 'no-such-course' })).toEqual({ items: [], totalItems: 0 });
		expect(await getCourseReadRepository([]).search(defaults)).toEqual({ items: [], totalItems: 0 });
		const result = await search({ page: 100 });
		expect(result.items).toEqual([]);
		expect(result.totalItems).toBe(COURSE_FIXTURES.length);
	});
});
