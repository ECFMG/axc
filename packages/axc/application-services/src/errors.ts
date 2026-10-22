export interface ErrorDetail {
	readonly field: string;
	readonly message: string;
}

export type ApplicationErrorCode = 'INVALID_QUERY_PARAMETER' | 'INVALID_REQUEST' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';

const ERROR_MESSAGE: Record<ApplicationErrorCode, string> = {
	INVALID_QUERY_PARAMETER: 'One or more query parameters are invalid.',
	INVALID_REQUEST: 'The request could not be completed.',
	COURSE_NOT_FOUND: 'The request could not be completed.',
	COURSE_NOT_ACTIVE: 'The request could not be completed.',
	DUPLICATE_ACTIVE_REQUEST: 'The request could not be completed.',
	ENROLLMENT_REQUEST_NOT_FOUND: 'The request could not be completed.',
	INVALID_STATUS_TRANSITION: 'The request could not be completed.',
};

export class ApplicationError extends Error {
	readonly code: ApplicationErrorCode;
	readonly details: readonly ErrorDetail[];

	constructor(code: ApplicationErrorCode, details: readonly ErrorDetail[]) {
		super(ERROR_MESSAGE[code]);
		this.name = 'ApplicationError';
		this.code = code;
		this.details = details;
	}
}
