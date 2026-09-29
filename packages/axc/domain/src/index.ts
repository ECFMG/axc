import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export type { Course, CourseModality, CourseStatus } from './course/course.ts';
export { COURSE_MODALITIES, COURSE_STATUSES, isCourseModality, isCourseStatus } from './course/course.ts';
export type { CourseReadRepository, CourseSearchCriteria, CourseSearchPage, CourseSortField } from './course/course-search.ts';
export { COURSE_SORT_FIELDS, DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT_FIELD, isCourseSortField, MAX_COURSE_PAGE_SIZE, searchCourses } from './course/course-search.ts';
