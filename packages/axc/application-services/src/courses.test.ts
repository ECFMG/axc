import type { Course } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { createCourseService } from './courses.ts';

const course: Course = { id: 'b', title: 'Security', summary: 'Training', modality: 'online', status: 'active', tags: ['AI'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' };

describe('course search service', () => {
	it('breaks sort ties by id without mutating repository data', async () => {
		const source = [course, { ...course, id: 'a' }];
		const service = createCourseService({ list: () => Promise.resolve(source) });
		const result = await service.search({ page: 1, pageSize: 10, sort: 'title' });
		expect(result.items.map((item) => item.id)).toEqual(['a', 'b']);
		expect(source.map((item) => item.id)).toEqual(['b', 'a']);
	});
	it('counts matches before pagination', async () => {
		const service = createCourseService({ list: () => Promise.resolve([course, { ...course, id: 'a' }, { ...course, id: 'c', status: 'draft' }]) });
		expect(await service.search({ status: 'active', tag: 'ai', page: 2, pageSize: 1, sort: 'title' })).toMatchObject({ items: [course], totalItems: 2, totalPages: 2 });
	});
});
