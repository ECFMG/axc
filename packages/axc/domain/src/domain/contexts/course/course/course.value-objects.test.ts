import { describe, expect, it } from 'vitest';
import { CourseModality, CourseSort, CourseStatus } from './course.value-objects.ts';

describe('course value objects', () => {
	it('define the allowed modality, status and sort values', () => {
		expect(Object.values(CourseModality)).toEqual(['online', 'in-person', 'hybrid']);
		expect(Object.values(CourseStatus)).toEqual(['draft', 'active', 'retired']);
		expect(Object.values(CourseSort)).toEqual(['title', 'createdAt', 'updatedAt']);
	});
});
