/**
 * agentCourses domain layer.
 *
 * @remarks
 * Holds the course catalog and enrollment request models, the rules that govern them, the
 * domain error vocabulary, and the repository ports the application layer depends on. Nothing
 * here imports a delivery, persistence, or infrastructure concern.
 */

export type { Course, CourseModality, CourseStatus } from './course.ts';
export { COURSE_MODALITIES, COURSE_STATUSES, isEnrollableCourse } from './course.ts';
export type { CourseSearchCriteria, CourseSearchResult, CourseSortField } from './course-search.ts';
export { COURSE_SORT_FIELDS, DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT, MAX_COURSE_PAGE_SIZE, searchCourseCollection, validateCourseSearchQuery } from './course-search.ts';
export type { ChangeEnrollmentRequestStatusCommand, CreateEnrollmentRequestCommand, EnrollmentRequest, EnrollmentRequestStatus, StatusHistoryEntry } from './enrollment-request.ts';
export {
	ACTIVE_ENROLLMENT_REQUEST_STATUSES,
	applyStatusChange,
	createEnrollmentRequest,
	ENROLLMENT_REQUEST_STATUSES,
	INITIAL_ENROLLMENT_REQUEST_STATUS,
	isActiveEnrollmentStatus,
	isValidStatusTransition,
	SYSTEM_ACTOR,
} from './enrollment-request.ts';
export type { EnrollmentRequestFilters } from './enrollment-request-commands.ts';
export {
	isValidEmail,
	MAX_JUSTIFICATION_LENGTH,
	MIN_JUSTIFICATION_LENGTH,
	normalizeEmail,
	validateChangeEnrollmentRequestStatus,
	validateCreateEnrollmentRequest,
	validateEnrollmentRequestFilters,
} from './enrollment-request-commands.ts';
export type { AxcErrorCode, ErrorDetail } from './errors.ts';
export { AxcDomainError, courseNotActive, courseNotFound, duplicateActiveRequest, enrollmentRequestNotFound, invalidQueryParameters, invalidRequest, invalidStatusTransition } from './errors.ts';
export type { RawBody, RawQuery } from './raw-input.ts';
export type { CourseRepository, DomainRepository, EnrollmentRequestRepository } from './repositories.ts';
