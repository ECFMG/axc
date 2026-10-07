import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export type { CourseCatalog, CourseModality, CourseProps, CourseSortField, CourseStatus } from './course.ts';
export { Course, courseModalities, courseSortFields, courseStatuses } from './course.ts';
