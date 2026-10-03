import type { Repository } from '@cellix/domain-seedwork/repository';

export type { Course, CourseModality, CourseReadRepository, CourseStatus } from './course.ts';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;
