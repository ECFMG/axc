import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;
export type { Course, CourseModality, CourseRepository, CourseStatus } from './course.ts';
