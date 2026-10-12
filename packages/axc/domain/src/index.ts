import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export { type Course, type CourseModality, type CourseSearchCriteria, type CourseSortField, type CourseStatus, compareCourses, courseModalities, courseSortFields, courseStatuses, matchesCourse } from './course.ts';
export {
	activeEnrollmentStatuses,
	createEnrollmentRequest,
	type EnrollmentRequest,
	type EnrollmentStatus,
	enrollmentStatuses,
	isEnrollmentStatus,
	isValidJustification,
	isValidLearnerEmail,
	isValidTransition,
	justificationMaxLength,
	justificationMinLength,
	type NewEnrollmentRequest,
	type StatusChange,
	type StatusHistoryEntry,
	withStatusChange,
} from './enrollment-request.ts';
