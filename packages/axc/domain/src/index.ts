import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export {
	COURSE_MODALITIES,
	COURSE_SORTS,
	COURSE_STATUSES,
	type Course,
	type CourseModality,
	type CourseRepository,
	type CourseSort,
	type CourseStatus,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	isCourseModality,
	isCourseSort,
	isCourseStatus,
	MAX_COURSE_PAGE_SIZE,
} from './course.ts';
export { courseCatalog } from './course-catalog.ts';
export {
	canTransitionEnrollmentStatus,
	ENROLLMENT_CREATED_BY,
	ENROLLMENT_STATUSES,
	type EnrollmentRequest,
	type EnrollmentRequestRepository,
	type EnrollmentStatus,
	hasActiveEnrollment,
	isEnrollmentStatus,
	isJustificationLength,
	isLearnerEmail,
	JUSTIFICATION_MAX_LENGTH,
	JUSTIFICATION_MIN_LENGTH,
	learnerEmailsMatch,
	type StatusHistoryEntry,
} from './enrollment-request.ts';
