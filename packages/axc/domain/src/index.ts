import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export type { Course, CourseModality, CourseStatus } from './course.ts';
export { courseModalities, courseStatuses, isCourseModality, isCourseStatus } from './course.ts';
export { courseCatalogSeed } from './course-catalog-seed.ts';
export type { EnrollmentRequest, EnrollmentStatus, StatusHistoryEntry } from './enrollment-request.ts';
export {
	canTransition,
	ENROLLMENT_CREATED_BY,
	enrollmentStatuses,
	isBlockingEnrollmentStatus,
	isEnrollmentStatus,
	isValidJustification,
	isValidLearnerEmail,
	JUSTIFICATION_MAX_LENGTH,
	JUSTIFICATION_MIN_LENGTH,
} from './enrollment-request.ts';
