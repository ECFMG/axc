import { describe, expect, it } from 'vitest';
import { COURSE_MODALITIES, COURSE_STATUSES, isCourseModality, isCourseStatus } from './course.ts';
import { COURSE_SORT_FIELDS, DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT_FIELD, isCourseSortField, MAX_COURSE_PAGE_SIZE } from './course-search.ts';

describe('course vocabulary', () => {
	it('publishes the documented modality, status, and sort values', () => {
		expect(COURSE_MODALITIES).toStrictEqual(['online', 'in-person', 'hybrid']);
		expect(COURSE_STATUSES).toStrictEqual(['draft', 'active', 'retired']);
		expect(COURSE_SORT_FIELDS).toStrictEqual(['title', 'createdAt', 'updatedAt']);
	});

	it('publishes the documented pagination and sort defaults', () => {
		expect(DEFAULT_COURSE_PAGE).toBe(1);
		expect(DEFAULT_COURSE_PAGE_SIZE).toBe(10);
		expect(MAX_COURSE_PAGE_SIZE).toBe(50);
		expect(DEFAULT_COURSE_SORT_FIELD).toBe('title');
	});

	it('narrows only exact, case-sensitive vocabulary members', () => {
		expect(isCourseModality('hybrid')).toBe(true);
		expect(isCourseModality('Online')).toBe(false);
		expect(isCourseStatus('retired')).toBe(true);
		expect(isCourseStatus('archived')).toBe(false);
		expect(isCourseSortField('updatedAt')).toBe(true);
		expect(isCourseSortField('summary')).toBe(false);
	});
});
