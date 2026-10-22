export interface FieldError {
	field: string;
	message: string;
}

export type ApplicationErrorCode = 'INVALID_QUERY_PARAMETER' | 'INVALID_REQUEST' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';

export class ApplicationError extends Error {
	readonly code: ApplicationErrorCode;
	readonly details: readonly FieldError[];

	constructor(code: ApplicationErrorCode, message: string, details: readonly FieldError[] = []) {
		super(message);
		this.name = 'ApplicationError';
		this.code = code;
		this.details = details;
	}
}
