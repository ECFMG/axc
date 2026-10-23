import type { Repository } from '@cellix/domain-seedwork/repository';

export type { CatalogStore } from './catalog.ts';
export type { Course, CourseModality, CourseStatus } from './course.ts';
export { isCourseModality, isCourseStatus } from './course.ts';
export type { EnrollmentRequest, EnrollmentStatus, StatusHistoryEntry } from './enrollment-request.ts';
export { applyStatusChange, canTransition, isActiveEnrollmentStatus, isEnrollmentStatus, isValidEmail, isValidJustification, newEnrollmentRequest } from './enrollment-request.ts';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;
