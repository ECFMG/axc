import { describe, expect, it } from 'vitest';
import {
	COURSE_MODALITIES,
	COURSE_SORT_FIELDS,
	COURSE_STATUSES,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	DEFAULT_COURSE_SORT,
	isCourseModality,
	isCourseSortField,
	isCourseStatus,
	MAX_COURSE_PAGE_SIZE,
} from './course.value-objects.ts';

describe('course catalog value objects', () => {
	it('defines the allowed modalities, statuses, and sort fields', () => {
		expect(COURSE_MODALITIES).toEqual(['online', 'in-person', 'hybrid']);
		expect(COURSE_STATUSES).toEqual(['draft', 'active', 'retired']);
		expect(COURSE_SORT_FIELDS).toEqual(['title', 'createdAt', 'updatedAt']);
	});

	it('defines catalog pagination and sort defaults', () => {
		expect(DEFAULT_COURSE_PAGE).toBe(1);
		expect(DEFAULT_COURSE_PAGE_SIZE).toBe(10);
		expect(MAX_COURSE_PAGE_SIZE).toBe(50);
		expect(DEFAULT_COURSE_SORT).toBe('title');
	});

	it('narrows allowed modality, status, and sort values', () => {
		expect(isCourseModality('online')).toBe(true);
		expect(isCourseModality('remote')).toBe(false);
		expect(isCourseStatus('active')).toBe(true);
		expect(isCourseStatus('archived')).toBe(false);
		expect(isCourseSortField('createdAt')).toBe(true);
		expect(isCourseSortField('popularity')).toBe(false);
	});
});
