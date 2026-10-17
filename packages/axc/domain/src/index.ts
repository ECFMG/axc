import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export type { Course, CourseModality, CourseSearchCriteria, CourseSearchPage, CourseSortField, CourseStatus } from './course.ts';
export { COURSE_MODALITIES, COURSE_SORT_FIELDS, COURSE_STATUSES, searchCourseCatalog } from './course.ts';
