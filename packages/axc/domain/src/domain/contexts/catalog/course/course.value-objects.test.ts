import { expect, it } from 'vitest';
import { COURSE_DEFAULT_PAGE, COURSE_DEFAULT_PAGE_SIZE, COURSE_MAX_PAGE_SIZE, COURSE_MODALITIES, COURSE_SORTS, COURSE_STATUSES } from './course.value-objects.ts';

it('defines the catalog contract', () => {
	expect(COURSE_MODALITIES).toEqual(['online', 'in-person', 'hybrid']);
	expect(COURSE_STATUSES).toEqual(['draft', 'active', 'retired']);
	expect(COURSE_SORTS).toEqual(['title', 'createdAt', 'updatedAt']);
	expect([COURSE_DEFAULT_PAGE, COURSE_DEFAULT_PAGE_SIZE, COURSE_MAX_PAGE_SIZE]).toEqual([1, 10, 50]);
});
