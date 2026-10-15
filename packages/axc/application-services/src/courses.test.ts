import type { Course, CourseCatalog } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { type CourseSearch, createCourseService } from './courses.ts';
import { buildApplicationServicesFactory } from './index.ts';

const courses: Course[] = [
	{ id: 'a', title: 'Security Basics', summary: 'First steps', modality: 'online', status: 'active', tags: ['AI'], createdAt: '2026-01-03T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' },
	{ id: 'b', title: 'API Design', summary: 'SECURITY in practice', modality: 'hybrid', status: 'draft', tags: ['web'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-02-03T00:00:00.000Z' },
	{ id: 'c', title: 'Incident Response', summary: 'Investigations', modality: 'online', status: 'active', tags: ['Security', 'ai'], createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-02-02T00:00:00.000Z' },
];
const catalog: CourseCatalog = { list: () => Promise.resolve(courses) };
const search = (overrides: Partial<CourseSearch> = {}) => createCourseService(catalog).search({ page: 1, pageSize: 10, sort: 'title', ...overrides });
const ids = (items: Course[]) => items.map((item) => item.id);

describe('course search', () => {
	it('returns title-sorted items and metadata', async () => {
		const result = await search();
		expect(ids(result.items)).toEqual(['b', 'c', 'a']);
		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 3, totalPages: 1 });
	});
	it('matches title, summary and tags case-insensitively', async () => {
		expect(ids((await search({ q: 'sEcUrItY' })).items)).toEqual(['b', 'c', 'a']);
		expect(ids((await search({ q: 'investigations' })).items)).toEqual(['c']);
		expect(ids((await search({ q: 'AI' })).items)).toEqual(['c', 'a']);
	});
	it.each(['online', 'in-person', 'hybrid'] as const)('filters modality %s', async (modality) => {
		expect(ids((await search({ modality })).items)).toEqual(ids(courses.filter((c) => c.modality === modality).sort((a, b) => a.title.localeCompare(b.title))));
	});
	it.each(['active', 'draft', 'retired'] as const)('filters status %s', async (status) => {
		const result = await search({ status });
		expect(result.totalItems).toBe(courses.filter((course) => course.status === status).length);
		expect(result.items.every((course) => course.status === status)).toBe(true);
	});
	it('matches whole tags ignoring case', async () => {
		expect(ids((await search({ tag: 'Ai' })).items)).toEqual(['c', 'a']);
		expect((await search({ tag: 'secur' })).items).toEqual([]);
	});
	it('combines keyword, modality and status with AND', async () => {
		expect(ids((await search({ q: 'security', modality: 'online', status: 'active' })).items)).toEqual(['c', 'a']);
	});
	it('combines tag, modality and status with AND', async () => {
		expect(ids((await search({ tag: 'ai', modality: 'hybrid', status: 'draft' })).items)).toEqual([]);
		expect(ids((await search({ tag: 'WEB', modality: 'hybrid', status: 'draft' })).items)).toEqual(['b']);
	});
	it('paginates after filtering and sorting', async () => {
		expect(await search({ page: 2, pageSize: 1, modality: 'online' })).toEqual({ items: [courses[0]], page: 2, pageSize: 1, totalItems: 2, totalPages: 2 });
		expect(await search({ page: 4, pageSize: 1 })).toMatchObject({ items: [], totalItems: 3, totalPages: 3 });
	});
	it.each([
		['createdAt', ['b', 'c', 'a']],
		['updatedAt', ['a', 'c', 'b']],
	] as const)('sorts %s ascending', async (sort, expected) => {
		expect(ids((await search({ sort })).items)).toEqual(expected);
	});
	it('breaks sort ties by ID without mutating storage', async () => {
		const tied = [courses[2], courses[0]].filter((course): course is Course => course !== undefined).map((course) => ({ ...course, title: 'Same' }));
		const result = await createCourseService({ list: () => Promise.resolve(tied) }).search({ page: 1, pageSize: 10, sort: 'title' });
		expect(ids(result.items)).toEqual(['a', 'c']);
		expect(ids(tied)).toEqual(['c', 'a']);
	});
	it('returns zero total pages for no matches', async () => {
		expect(await search({ q: 'no such course' })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
	it('wires the supplied catalog into request services', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test', courseCatalog: catalog }).forRequest();
		expect(await services.courses.search({ page: 1, pageSize: 10, sort: 'title' })).toEqual(await search());
	});
});
