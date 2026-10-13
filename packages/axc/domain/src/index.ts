import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export type { CourseModality, CourseProps, CourseRepository, CourseSnapshot, CourseStatus } from './course.ts';
export { COURSE_MODALITIES, COURSE_STATUSES, Course } from './course.ts';
