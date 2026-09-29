import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export type { Course, CourseModality, CourseStatus } from './course/course.ts';
export { COURSE_MODALITIES, COURSE_STATUSES, isCourseModality, isCourseStatus } from './course/course.ts';
export type { CourseReadRepository } from './course/course-read-repository.ts';
export type { CourseSearchResult } from './course/course-search.ts';
export { compareCourses, matchesCourseSearchCriteria, searchCourses } from './course/course-search.ts';
export type { CourseSearchCriteria, CourseSearchCriteriaParseResult, CourseSearchCriteriaViolation, CourseSortField, RawCourseSearchQuery } from './course/course-search-criteria.ts';
export {
	COURSE_SORT_FIELDS,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	DEFAULT_COURSE_SORT_FIELD,
	isCourseSortField,
	MAX_COURSE_KEYWORD_LENGTH,
	MAX_COURSE_PAGE_SIZE,
	parseCourseSearchCriteria,
} from './course/course-search-criteria.ts';
