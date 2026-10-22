import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export type { Course, CourseModality, CourseSort, CourseStatus } from './course.ts';
export {
	COURSE_FIXTURES,
	COURSE_MODALITIES,
	COURSE_SORTS,
	COURSE_STATUSES,
	copyCourse,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	DEFAULT_COURSE_SORT,
	isCourseModality,
	isCourseSort,
	isCourseStatus,
	MAX_COURSE_PAGE_SIZE,
} from './course.ts';
export type { EnrollmentRequest, EnrollmentStatus, StatusHistoryEntry } from './enrollment-request.ts';
export {
	canTransitionEnrollmentStatus,
	copyEnrollmentRequest,
	ENROLLMENT_CREATED_BY,
	ENROLLMENT_STATUSES,
	isActiveEnrollmentStatus,
	isEnrollmentStatus,
	isValidJustification,
	JUSTIFICATION_MAX_LENGTH,
	JUSTIFICATION_MIN_LENGTH,
	normalizeLearnerEmail,
} from './enrollment-request.ts';
