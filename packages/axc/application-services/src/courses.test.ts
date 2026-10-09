import type { Course, CourseSearch } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { createCourseService } from './courses.ts';

const course: Course = {
	id: 'b',
	title: 'Security',
	summary: 'Training',
	modality: 'online',
	status: 'active',
	tags: ['AI'],
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-02-01T00:00:00.000Z',
};
const query: CourseSearch = { page: 1, pageSize: 10, sort: 'title' };

describe('course service', () => {
	it('uses ID to break sort ties without mutating repository order', async () => {
		const records = [course, { ...course, id: 'a' }];
		const service = createCourseService({ list: async () => records });
		for (const sort of ['title', 'createdAt', 'updatedAt'] as const) {
			expect((await service.search({ ...query, sort })).items.map((item) => item.id)).toEqual(['a', 'b']);
		}
		expect(records.map((item) => item.id)).toEqual(['b', 'a']);
	});
	it('intersects all filters before calculating pagination metadata', async () => {
		const service = createCourseService({ list: async () => [course, { ...course, id: 'c', modality: 'hybrid' }] });
		const result = await service.search({ ...query, q: 'SECURITY', tag: 'ai', modality: 'online', status: 'active', pageSize: 1 });
		expect(result).toEqual({ items: [course], page: 1, pageSize: 1, totalItems: 1, totalPages: 1 });
	});
});
