import type { Repository } from '@cellix/domain-seedwork/repository';

export type { Course, CourseCatalog, CourseModality, CourseSortField, CourseStatus } from './course.ts';
export { courseModalities, courseSortFields, courseStatuses } from './course.ts';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;
