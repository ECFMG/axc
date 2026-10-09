import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;
export type { Course, CourseCatalog, CourseSearch, CourseSearchResult } from './course.ts';
export { COURSE_MODALITIES, COURSE_SORT_FIELDS, COURSE_STATUSES } from './course.ts';
