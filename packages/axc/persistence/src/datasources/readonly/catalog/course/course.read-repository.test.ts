import { describe, expect, it } from 'vitest';
import { buildDataSources, courseFixtures } from '../../../../index.ts';

describe('course read repository', () => {
	it('supplies at least 12 complete unique mixed courses', async () => {
		const courses = await buildDataSources(courseFixtures).readonlyDataSource.Catalog.Course.CourseReadRepo.getAll();
		expect(courses.length).toBeGreaterThanOrEqual(12);
		expect(new Set(courses.map((course) => course.id)).size).toBe(courses.length);
		expect(new Set(courses.map((course) => course.modality))).toEqual(new Set(['online', 'in-person', 'hybrid']));
		expect(new Set(courses.map((course) => course.status))).toEqual(new Set(['draft', 'active', 'retired']));
		expect(new Set(courses.flatMap((course) => course.tags)).size).toBeGreaterThan(3);
		for (const course of courses) {
			expect(Object.keys(course).sort()).toEqual(['createdAt', 'id', 'modality', 'status', 'summary', 'tags', 'title', 'updatedAt']);
			expect(course.id).not.toBe('');
			expect(course.title).not.toBe('');
			expect(course.summary).not.toBe('');
			expect(course.tags.length).toBeGreaterThan(0);
			expect(new Date(course.createdAt).toISOString()).toBe(course.createdAt);
			expect(new Date(course.updatedAt).toISOString()).toBe(course.updatedAt);
		}
	});
	it('returns an empty repository when explicitly supplied no courses', async () => {
		expect(await buildDataSources([]).readonlyDataSource.Catalog.Course.CourseReadRepo.getAll()).toEqual([]);
	});
	it('isolates the source snapshot and each returned collection', async () => {
		const input = structuredClone([...courseFixtures]);
		const repo = buildDataSources(input).readonlyDataSource.Catalog.Course.CourseReadRepo;
		input[0]?.tags.push('source changed');
		input.splice(0);
		const first = await repo.getAll();
		first[0]?.tags.push('changed');
		first.splice(0);
		const second = await repo.getAll();
		expect(second).toEqual(courseFixtures);
	});
});
