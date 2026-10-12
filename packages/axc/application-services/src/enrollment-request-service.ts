/** Application service behind the `/api/enrollment-requests` workflow. */

import type { CourseRepository, EnrollmentRequest, EnrollmentRequestRepository, RawQuery } from '@axc/domain';
import {
	applyStatusChange,
	courseNotActive,
	courseNotFound,
	createEnrollmentRequest,
	duplicateActiveRequest,
	enrollmentRequestNotFound,
	isEnrollableCourse,
	validateChangeEnrollmentRequestStatus,
	validateCreateEnrollmentRequest,
	validateEnrollmentRequestFilters,
} from '@axc/domain';

/** Enrollment request use cases. */
export interface EnrollmentRequestService {
	/**
	 * Creates a pending enrollment request for an active course.
	 *
	 * @throws AxcDomainError `INVALID_REQUEST`, `COURSE_NOT_FOUND`, `COURSE_NOT_ACTIVE`, or
	 * `DUPLICATE_ACTIVE_REQUEST`.
	 */
	create(input: unknown): Promise<EnrollmentRequest>;
	/**
	 * Resolves a single enrollment request, including its audit trail.
	 *
	 * @throws AxcDomainError `ENROLLMENT_REQUEST_NOT_FOUND`.
	 */
	getById(id: string): Promise<EnrollmentRequest>;
	/**
	 * Lists enrollment requests, most recently created first.
	 *
	 * @throws AxcDomainError `INVALID_QUERY_PARAMETER` when a filter is outside its domain.
	 */
	list(query: RawQuery): Promise<readonly EnrollmentRequest[]>;
	/**
	 * Moves an enrollment request to a new status and appends an audit entry.
	 *
	 * @throws AxcDomainError `INVALID_REQUEST`, `ENROLLMENT_REQUEST_NOT_FOUND`, or
	 * `INVALID_STATUS_TRANSITION`.
	 */
	changeStatus(id: string, input: unknown): Promise<EnrollmentRequest>;
}

/** Builds the enrollment request service over the course and enrollment request repositories. */
export function createEnrollmentRequestService(courses: CourseRepository, enrollmentRequests: EnrollmentRequestRepository): EnrollmentRequestService {
	return {
		async create(input: unknown): Promise<EnrollmentRequest> {
			const command = validateCreateEnrollmentRequest(input);

			const course = await courses.findById(command.courseId);
			if (course === undefined) {
				throw courseNotFound(command.courseId);
			}
			if (!isEnrollableCourse(course)) {
				throw courseNotActive(course.id, course.status);
			}

			const existing = await enrollmentRequests.findActiveForLearner(command.courseId, command.learnerEmail);
			if (existing !== undefined) {
				throw duplicateActiveRequest(command.courseId, command.learnerEmail);
			}

			const id = await enrollmentRequests.nextIdentity();
			return await enrollmentRequests.save(createEnrollmentRequest(id, command, new Date().toISOString()));
		},

		async getById(id: string): Promise<EnrollmentRequest> {
			const request = await enrollmentRequests.findById(id);
			if (request === undefined) {
				throw enrollmentRequestNotFound(id);
			}
			return request;
		},

		async list(query: RawQuery): Promise<readonly EnrollmentRequest[]> {
			return await enrollmentRequests.findByFilters(validateEnrollmentRequestFilters(query));
		},

		async changeStatus(id: string, input: unknown): Promise<EnrollmentRequest> {
			const command = validateChangeEnrollmentRequestStatus(input);

			const request = await enrollmentRequests.findById(id);
			if (request === undefined) {
				throw enrollmentRequestNotFound(id);
			}

			return await enrollmentRequests.save(applyStatusChange(request, command, new Date().toISOString()));
		},
	};
}
