import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export { COURSE_MODALITIES, COURSE_STATUSES, type Course, type CourseCatalog, type CourseModality, type CourseStatus } from './course.ts';
