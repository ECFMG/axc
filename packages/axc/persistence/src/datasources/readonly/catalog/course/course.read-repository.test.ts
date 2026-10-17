import { describe, expect, it } from 'vitest';
import { CourseReadRepo } from './course.read-repository.ts';

describe('catalog fixtures', () => {
	it('provides twelve unique complete records and isolates returned data', async () => {
		const repo = CourseReadRepo();
		const query = { page: 1, pageSize: 50, sort: 'title' as const };
		const result = await repo.search(query);
		expect(result.totalItems).toBe(12);
		expect(new Set(result.items.map((c) => c.id)).size).toBe(12);
		expect(new Set(result.items.map((c) => c.modality)).size).toBe(3);
		expect(new Set(result.items.map((c) => c.status)).size).toBe(3);
		for (const course of result.items) {
			expect(course.title.length).toBeGreaterThan(0);
			expect(course.summary.length).toBeGreaterThan(0);
			expect(course.tags.length).toBeGreaterThan(0);
			expect(new Date(course.createdAt).toISOString()).toBe(course.createdAt);
			expect(new Date(course.updatedAt).toISOString()).toBe(course.updatedAt);
		}
		const first = result.items[0];
		if (!first) throw new Error('Missing fixture');
		(first.tags as string[]).push('mutated');
		expect((await repo.search(query)).items[0]?.tags).toEqual(['ai', 'security']);
	});
});
