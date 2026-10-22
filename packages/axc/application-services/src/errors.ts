const INVALID_QUERY_MESSAGE = 'One or more query parameters are invalid.';
export const REQUEST_FAILURE_MESSAGE = 'The request could not be completed.';

export interface ErrorDetail {
	field: string;
	message: string;
}

type ClientErrorStatus = 400 | 404 | 409;

export class ApiError extends Error {
	readonly status: ClientErrorStatus;
	readonly code: string;
	readonly details: readonly ErrorDetail[];

	constructor(status: ClientErrorStatus, code: string, message: string, details: readonly ErrorDetail[]) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

export function invalidQuery(details: readonly ErrorDetail[]): ApiError {
	return new ApiError(400, 'INVALID_QUERY_PARAMETER', INVALID_QUERY_MESSAGE, details);
}

export function invalidRequest(details: readonly ErrorDetail[]): ApiError {
	return new ApiError(400, 'INVALID_REQUEST', REQUEST_FAILURE_MESSAGE, details);
}
