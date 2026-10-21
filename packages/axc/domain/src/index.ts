import type { Repository } from '@cellix/domain-seedwork/repository';

export type { Course, CourseModality, CourseStatus } from './course.ts';
export { courseModalities, courseStatuses } from './course.ts';
export type { EnrollmentRequest, EnrollmentRequestStatus, EnrollmentRequestStore, EnrollmentStatusUpdateTarget, StatusHistoryEntry } from './enrollment-request.ts';
export {
	canTransitionEnrollmentRequest,
	createPendingEnrollmentRequest,
	enrollmentRequestStatuses,
	enrollmentStatusUpdateTargets,
	hasActiveEnrollmentRequest,
	isEnrollmentRequestStatus,
	isEnrollmentStatusUpdateTarget,
	isValidLearnerEmail,
	JUSTIFICATION_MAX_LENGTH,
	JUSTIFICATION_MIN_LENGTH,
	transitionEnrollmentRequest,
} from './enrollment-request.ts';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;
