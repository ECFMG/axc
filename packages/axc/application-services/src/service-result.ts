export interface FieldError {
	field: string;
	message: string;
}

export type ServiceErrorCode = 'INVALID_QUERY_PARAMETER' | 'INVALID_REQUEST' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';

export interface ServiceError {
	status: 400 | 404 | 409;
	code: ServiceErrorCode;
	message: string;
	details: FieldError[];
}

export type ServiceResult<T> = { ok: true; value: T } | { ok: false; error: ServiceError };

export function success<T>(value: T): ServiceResult<T> {
	return { ok: true, value };
}

export function failure(error: ServiceError): ServiceResult<never> {
	return { ok: false, error };
}

export function invalidRequest(details: FieldError[]): ServiceError {
	return {
		status: 400,
		code: 'INVALID_REQUEST',
		message: 'The request could not be completed.',
		details,
	};
}

export function invalidQuery(details: FieldError[]): ServiceError {
	return {
		status: 400,
		code: 'INVALID_QUERY_PARAMETER',
		message: 'One or more query parameters are invalid.',
		details,
	};
}
