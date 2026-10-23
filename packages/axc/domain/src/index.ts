import type { Repository } from '@cellix/domain-seedwork/repository';

export type { Course, CourseModality, CourseStatus } from './course.ts';
export { COURSE_MODALITIES, COURSE_STATUSES, isCourseModality, isCourseStatus } from './course.ts';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;
