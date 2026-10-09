import type { Repository } from '@cellix/domain-seedwork/repository';
export type DomainRepository<T> = Repository<T>;
export type { Course, CourseModality, CourseStatus } from './domain/contexts/catalog/course/index.ts';
export type { EnrollmentRequestRepository, EnrollmentRequestUnitOfWork } from './domain/contexts/catalog/enrollment-request/index.ts';
export { type EnrollmentRequest, type EnrollmentStatus, mayTransition, type StatusHistoryEntry } from './domain/contexts/catalog/enrollment-request/index.ts';
export * as Contexts from './domain/contexts/index.ts';
