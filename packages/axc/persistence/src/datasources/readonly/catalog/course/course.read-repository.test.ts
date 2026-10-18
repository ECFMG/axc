import { describe, expect, it } from 'vitest';
import { courseData } from './course.data.ts';
import { createCourseReadRepository } from './course.read-repository.ts';

describe('catalog fixtures and repository', () => {
	it('contains twelve unique complete courses with varied modality, status and tags', () => {
		expect(courseData).toHaveLength(12);
		expect(new Set(courseData.map((c) => c.id)).size).toBe(12);
		expect(new Set(courseData.map((c) => c.modality)).size).toBe(3);
		expect(new Set(courseData.map((c) => c.status)).size).toBe(3);
		expect(new Set(courseData.flatMap((c) => c.tags)).size).toBeGreaterThan(3);
		for (const course of courseData) {
			expect(course.title.length).toBeGreaterThan(0);
			expect(course.summary.length).toBeGreaterThan(0);
			expect(course.tags.length).toBeGreaterThan(0);
			expect(new Date(course.createdAt).toISOString()).toBe(course.createdAt);
			expect(new Date(course.updatedAt).toISOString()).toBe(course.updatedAt);
		}
	});
	it('combines filters, sorts, and paginates with matching totals', async () => {
		const result = await createCourseReadRepository().search({ q: 'SECURITY', modality: 'online', status: 'active', page: 2, pageSize: 1, sort: 'title' });
		expect(result).toMatchObject({ page: 2, pageSize: 1, totalItems: 2, totalPages: 2 });
		expect(result.items.map((c) => c.id)).toEqual(['course-002']);
	});
	it('copies items and nested tags so callers cannot mutate fixtures', async () => {
		const repo = createCourseReadRepository();
		const query = { page: 1, pageSize: 10, sort: 'title' } as const;
		const first = await repo.search(query);
		const item = first.items[0];
		if (!item) throw new Error('Missing fixture');
		item.title = 'changed';
		item.tags.push('changed');
		const second = await repo.search(query);
		expect(second.items[0]?.title).toBe('Agent Design');
		expect(second.items[0]?.tags).toEqual(['ai']);
	});
});
