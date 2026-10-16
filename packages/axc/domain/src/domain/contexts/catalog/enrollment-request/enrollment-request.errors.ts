export interface RequestErrorDetail {
	field: string;
	message: string;
}

export class EnrollmentWorkflowError extends Error {
	public readonly code: string;
	public readonly httpStatus: number;
	public readonly details: RequestErrorDetail[];

	public constructor(code: string, message: string, httpStatus: number, details: RequestErrorDetail[] = []) {
		super(message);
		this.name = 'EnrollmentWorkflowError';
		this.code = code;
		this.httpStatus = httpStatus;
		this.details = details;
	}
}

export class InvalidRequestError extends EnrollmentWorkflowError {
	public constructor(details: RequestErrorDetail[]) {
		super('INVALID_REQUEST', 'The request could not be completed.', 400, details);
		this.name = 'InvalidRequestError';
	}
}

export class CourseNotFoundError extends EnrollmentWorkflowError {
	public constructor() {
		super('COURSE_NOT_FOUND', 'The requested course was not found.', 404, [{ field: 'courseId', message: 'courseId must reference an existing course.' }]);
		this.name = 'CourseNotFoundError';
	}
}

export class CourseNotActiveError extends EnrollmentWorkflowError {
	public constructor() {
		super('COURSE_NOT_ACTIVE', 'Enrollment requests can only be created for active courses.', 409, [{ field: 'courseId', message: 'courseId must reference a course with status active.' }]);
		this.name = 'CourseNotActiveError';
	}
}

export class DuplicateActiveRequestError extends EnrollmentWorkflowError {
	public constructor() {
		super('DUPLICATE_ACTIVE_REQUEST', 'A pending or approved enrollment request already exists for this learner and course.', 409, [
			{ field: 'courseId', message: 'A learner may not have more than one pending or approved request for the same course.' },
		]);
		this.name = 'DuplicateActiveRequestError';
	}
}

export class EnrollmentRequestNotFoundError extends EnrollmentWorkflowError {
	public constructor() {
		super('ENROLLMENT_REQUEST_NOT_FOUND', 'The requested enrollment request was not found.', 404, [{ field: 'id', message: 'id must reference an existing enrollment request.' }]);
		this.name = 'EnrollmentRequestNotFoundError';
	}
}

export class InvalidStatusTransitionError extends EnrollmentWorkflowError {
	public constructor(fromStatus: string, toStatus: string) {
		super('INVALID_STATUS_TRANSITION', `Status cannot change from ${fromStatus} to ${toStatus}.`, 409, [{ field: 'status', message: `Transition from ${fromStatus} to ${toStatus} is not allowed.` }]);
		this.name = 'InvalidStatusTransitionError';
	}
}
