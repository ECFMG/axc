import type { Repository } from '@cellix/domain-seedwork/repository';

export type { Course, CourseModality, CourseStatus } from './course.ts';
export { COURSE_MODALITIES, COURSE_STATUSES, isCourseModality, isCourseStatus } from './course.ts';
export type { ActiveEnrollmentRequestStatus, EnrollmentRequest, EnrollmentRequestStatus, StatusHistoryEntry } from './enrollment-request.ts';
export {
	ACTIVE_ENROLLMENT_REQUEST_STATUSES,
	canTransitionEnrollmentStatus,
	ENROLLMENT_REQUEST_STATUSES,
	ENROLLMENT_STATUS_TRANSITIONS,
	isActiveEnrollmentRequestStatus,
	isEnrollmentRequestStatus,
} from './enrollment-request.ts';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;
