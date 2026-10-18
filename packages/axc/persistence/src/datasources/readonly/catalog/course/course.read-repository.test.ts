import { describe, expect, it } from 'vitest';
import { createCourseReadRepository } from './course.read-repository.ts';

describe('in-memory courses', () => {
	it('copies courses and tags so consumers cannot mutate fixtures', async () => {
		const repo = createCourseReadRepository();
		const query = { page: 1, pageSize: 50, sort: 'title' as const };
		const result = await repo.search(query);
		expect(result.items).toHaveLength(12);
		const course = result.items[0];
		expect(course).toBeDefined();
		if (!course) throw new Error('Missing fixture');
		course.title = 'changed';
		course.tags.push('changed');
		const fresh = await repo.search(query);
		expect(fresh.items[0]?.title).toBe('AI Security Foundations');
		expect(fresh.items[0]?.tags).toEqual(['ai', 'security']);
		expect(new Set(fresh.items.map((c) => c.id)).size).toBe(12);
		expect(new Set(fresh.items.map((c) => c.modality)).size).toBe(3);
		expect(new Set(fresh.items.map((c) => c.status)).size).toBe(3);
	});
});
