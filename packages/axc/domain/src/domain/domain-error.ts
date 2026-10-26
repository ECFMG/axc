export type DomainErrorCode = 'INVALID_QUERY_PARAMETER' | 'INVALID_REQUEST' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';

export interface ErrorDetail {
	field: string;
	message: string;
}

/** Business-rule failure; the code is stable and mapped to a transport status by the caller. */
export class DomainError extends Error {
	readonly code: DomainErrorCode;
	readonly details: ErrorDetail[];

	constructor(code: DomainErrorCode, message: string, details: ErrorDetail[] = []) {
		super(message);
		this.name = 'DomainError';
		this.code = code;
		this.details = details;
	}
}

export const invalidRequest = (details: ErrorDetail[]): DomainError => new DomainError('INVALID_REQUEST', 'The request could not be completed.', details);
