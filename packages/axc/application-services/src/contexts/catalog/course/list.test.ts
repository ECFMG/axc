import { createDataSources } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { type CourseListQuery, list } from './list.ts';

const defaults: CourseListQuery = { page: 1, pageSize: 10, sort: 'title' };
const search = list(createDataSources());

describe('course catalog query', () => {
	it('searches title, summary, and tags without case sensitivity', async () => {
		expect((await search({ ...defaults, q: 'SECURITY' })).items.map((course) => course.id)).toEqual(['course-001', 'course-005']);
		expect((await search({ ...defaults, q: 'INCLUSIVE' })).items.map((course) => course.id)).toEqual(['course-009']);
		expect((await search({ ...defaults, q: 'ETHICS' })).items.map((course) => course.id)).toEqual(['course-012']);
	});

	it('combines filters and paginates sorted matches', async () => {
		expect((await search({ ...defaults, modality: 'online', status: 'active', tag: 'AI' })).items.map((course) => course.id)).toEqual(['course-001', 'course-012']);
		const result = await search({ ...defaults, page: 2, pageSize: 5, sort: 'createdAt' });
		expect(result.items.map((course) => course.id)).toEqual(['course-002', 'course-003', 'course-005', 'course-006', 'course-010']);
		expect([result.totalItems, result.totalPages]).toEqual([12, 3]);
	});

	it('returns empty metadata when nothing matches', async () => {
		expect(await search({ ...defaults, q: 'missing course' })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
});
