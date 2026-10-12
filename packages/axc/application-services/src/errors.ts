/** Error codes rendered by the REST layer, each with the HTTP status the task set requires. */
export const serviceErrorStatuses = {
	INVALID_QUERY_PARAMETER: 400,
	INVALID_REQUEST: 400,
	COURSE_NOT_FOUND: 404,
	ENROLLMENT_REQUEST_NOT_FOUND: 404,
	COURSE_NOT_ACTIVE: 409,
	DUPLICATE_ACTIVE_REQUEST: 409,
	INVALID_STATUS_TRANSITION: 409,
} as const;

export type ServiceErrorCode = keyof typeof serviceErrorStatuses;

export interface ServiceErrorDetail {
	field: string;
	message: string;
}

export class ServiceError extends Error {
	readonly code: ServiceErrorCode;
	readonly status: number;
	readonly details: ServiceErrorDetail[];

	constructor(code: ServiceErrorCode, message: string, details: ServiceErrorDetail[] = []) {
		super(message);
		this.name = 'ServiceError';
		this.code = code;
		this.status = serviceErrorStatuses[code];
		this.details = details;
	}
}

export function invalidQueryParameters(details: ServiceErrorDetail[]): ServiceError {
	return new ServiceError('INVALID_QUERY_PARAMETER', 'One or more query parameters are invalid.', details);
}

export function invalidRequest(details: ServiceErrorDetail[]): ServiceError {
	return new ServiceError('INVALID_REQUEST', 'The request could not be completed.', details);
}
