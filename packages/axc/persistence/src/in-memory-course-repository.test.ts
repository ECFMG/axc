import type { Course } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { courseSeed } from './course-seed.ts';
import { InMemoryCourseRepository } from './in-memory-course-repository.ts';

const makeCourse = (id: string): Course => ({
	id,
	title: `Course ${id}`,
	summary: `Summary for ${id}`,
	modality: 'online',
	status: 'active',
	tags: ['tag'],
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-02T00:00:00.000Z',
});

describe('InMemoryCourseRepository', () => {
	it('returns every course it was constructed with, in order', async () => {
		const courses = [makeCourse('a'), makeCourse('b'), makeCourse('c')];
		const repository = new InMemoryCourseRepository(courses);

		await expect(repository.getAll()).resolves.toEqual(courses);
	});

	it('returns an empty list when constructed with no courses', async () => {
		const repository = new InMemoryCourseRepository([]);

		await expect(repository.getAll()).resolves.toEqual([]);
	});

	it('returns the full seed when constructed with courseSeed', async () => {
		const repository = new InMemoryCourseRepository(courseSeed);

		const all = await repository.getAll();

		expect(all).toHaveLength(courseSeed.length);
		expect(all.map((course) => course.id)).toEqual(courseSeed.map((course) => course.id));
	});

	it('is not affected by later mutation of the input array', async () => {
		const courses = [makeCourse('a'), makeCourse('b')];
		const repository = new InMemoryCourseRepository(courses);

		courses.push(makeCourse('c'));
		courses.splice(0, 1);

		const all = await repository.getAll();
		expect(all.map((course) => course.id)).toEqual(['a', 'b']);
	});
});
