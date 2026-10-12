/**
 * Domain error vocabulary shared by every agentCourses application service.
 *
 * @remarks
 * Errors carry a stable machine-readable {@link AxcErrorCode} so the delivery layer can map
 * them onto HTTP status codes without re-implementing domain rules. The domain never
 * references HTTP concepts itself.
 */

/** Stable machine-readable code attached to every domain error. */
export type AxcErrorCode = 'INVALID_REQUEST' | 'INVALID_QUERY_PARAMETER' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';

/** Field-level explanation attached to validation failures. */
export interface ErrorDetail {
	readonly field: string;
	readonly message: string;
}

/** Error raised when an agentCourses domain rule is violated. */
export class AxcDomainError extends Error {
	public readonly code: AxcErrorCode;
	public readonly details: readonly ErrorDetail[];

	constructor(code: AxcErrorCode, message: string, details: readonly ErrorDetail[] = []) {
		super(message);
		this.name = 'AxcDomainError';
		this.code = code;
		this.details = details;
	}
}

/** The request body failed one or more domain validation rules. */
export function invalidRequest(details: readonly ErrorDetail[]): AxcDomainError {
	return new AxcDomainError('INVALID_REQUEST', 'The request could not be completed.', details);
}

/** One or more query string parameters are outside their allowed domain. */
export function invalidQueryParameters(details: readonly ErrorDetail[]): AxcDomainError {
	return new AxcDomainError('INVALID_QUERY_PARAMETER', 'One or more query parameters are invalid.', details);
}

/** No course exists for the supplied identifier. */
export function courseNotFound(courseId: string): AxcDomainError {
	return new AxcDomainError('COURSE_NOT_FOUND', `Course '${courseId}' does not exist.`, [{ field: 'courseId', message: `Course '${courseId}' does not exist.` }]);
}

/** The course exists but is not open for enrollment. */
export function courseNotActive(courseId: string, status: string): AxcDomainError {
	return new AxcDomainError('COURSE_NOT_ACTIVE', `Course '${courseId}' is '${status}' and does not accept enrollment requests.`, [
		{ field: 'courseId', message: `Course '${courseId}' must be 'active' to accept enrollment requests.` },
	]);
}

/** The learner already holds a pending or approved request for the course. */
export function duplicateActiveRequest(courseId: string, learnerEmail: string): AxcDomainError {
	return new AxcDomainError('DUPLICATE_ACTIVE_REQUEST', `'${learnerEmail}' already has a pending or approved enrollment request for course '${courseId}'.`, [
		{ field: 'learnerEmail', message: 'A learner may hold only one pending or approved enrollment request per course.' },
	]);
}

/** No enrollment request exists for the supplied identifier. */
export function enrollmentRequestNotFound(id: string): AxcDomainError {
	return new AxcDomainError('ENROLLMENT_REQUEST_NOT_FOUND', `Enrollment request '${id}' does not exist.`, [{ field: 'id', message: `Enrollment request '${id}' does not exist.` }]);
}

/** The requested status change is not part of the enrollment request lifecycle. */
export function invalidStatusTransition(fromStatus: string, toStatus: string): AxcDomainError {
	return new AxcDomainError('INVALID_STATUS_TRANSITION', `An enrollment request cannot move from '${fromStatus}' to '${toStatus}'.`, [{ field: 'status', message: `'${fromStatus}' cannot transition to '${toStatus}'.` }]);
}
