import { COURSE_MODALITIES, COURSE_STATUSES } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { courseFixtures } from './course-fixtures.ts';
import { createInMemoryCourseRepository } from './courses.ts';

describe('sample course repository', () => {
	it('provides at least 12 complete unique courses with every modality and status', async () => {
		const items = await createInMemoryCourseRepository(courseFixtures).getAll();
		expect(items.length).toBeGreaterThanOrEqual(12);
		expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
		expect(new Set(items.map((item) => item.modality))).toEqual(new Set(COURSE_MODALITIES));
		expect(new Set(items.map((item) => item.status))).toEqual(new Set(COURSE_STATUSES));
		for (const course of items) {
			expect(course.id).not.toBe('');
			expect(course.title).not.toBe('');
			expect(course.summary).not.toBe('');
			expect(course.tags.length).toBeGreaterThan(0);
			expect(new Date(course.createdAt).toISOString()).toBe(course.createdAt);
			expect(new Date(course.updatedAt).toISOString()).toBe(course.updatedAt);
		}
	});
	it('isolates retrieved records and nested tags', async () => {
		const repository = createInMemoryCourseRepository(courseFixtures);
		const items = await repository.getAll();
		const first = items[0];
		if (!first) throw new Error('missing fixture');
		first.title = 'Changed';
		first.tags.push('changed');
		expect(await repository.getAll()).toEqual(courseFixtures);
	});
	it('supports an empty catalog', async () => {
		expect(await createInMemoryCourseRepository([]).getAll()).toEqual([]);
	});
});
