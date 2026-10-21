import { describe, expect, it } from 'vitest';
import { type CourseQuery, courses, searchCourses } from './courses.ts';

const defaults: CourseQuery = { page: 1, pageSize: 10, sort: 'title' };

describe('course search use case', () => {
	it('has twelve immutable, valid, mixed fixtures with unique IDs', () => {
		expect(courses).toHaveLength(12);
		expect(new Set(courses.map((course) => course.id)).size).toBe(12);
		expect(new Set(courses.map((course) => course.modality)).size).toBe(3);
		expect(new Set(courses.map((course) => course.status)).size).toBe(3);
		for (const course of courses) {
			expect(Object.isFrozen(course)).toBe(true);
			expect(Object.isFrozen(course.tags)).toBe(true);
			expect(new Date(course.createdAt).toISOString()).toBe(course.createdAt);
			expect(new Date(course.updatedAt).toISOString()).toBe(course.updatedAt);
			expect(course.updatedAt >= course.createdAt).toBe(true);
			expect(course.title.length).toBeGreaterThan(0);
			expect(course.summary.length).toBeGreaterThan(0);
		}
	});
	it('sorts case-insensitively with a stable ID tie-break and preserves source order', () => {
		const first = courses[0];
		if (!first) throw new Error('Fixture missing');
		const catalog = [
			{ ...first, id: 'z', title: 'same' },
			{ ...first, id: 'a', title: 'SAME' },
		];
		expect(searchCourses(defaults, catalog).items.map((course) => course.id)).toEqual(['a', 'z']);
		expect(catalog.map((course) => course.id)).toEqual(['z', 'a']);
	});
	it('does not return duplicate records when several fields match', () => {
		expect(searchCourses({ ...defaults, q: 'security', modality: 'online', status: 'active' }).items.map((course) => course.id)).toEqual(['course-001']);
	});
});
