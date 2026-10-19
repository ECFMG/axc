import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export type { Course, CourseModality, CourseSearchCriteria, CourseSearchPage, CourseSortField, CourseStatus } from './course.ts';
export { COURSE_MODALITIES, COURSE_SORT_FIELDS, COURSE_STATUSES, searchCourseCatalog } from './course.ts';
export type { EnrollmentRequest, EnrollmentRequestFilter, EnrollmentRequestRepository, EnrollmentRequestStatus, EnrollmentStatusChange, NewEnrollmentRequest, StatusHistoryEntry } from './enrollment-request.ts';
export {
	courseAcceptsEnrollment,
	createPendingEnrollmentRequest,
	ENROLLMENT_REQUEST_STATUSES,
	filterEnrollmentRequests,
	findActiveEnrollmentRequest,
	isEnrollmentRequestStatus,
	JUSTIFICATION_MAX_LENGTH,
	JUSTIFICATION_MIN_LENGTH,
	normalizeJustification,
	normalizeLearnerEmail,
	transitionEnrollmentRequest,
} from './enrollment-request.ts';
