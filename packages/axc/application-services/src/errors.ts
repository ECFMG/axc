export interface ApiFieldError {
	field: string;
	message: string;
}

export type ApiErrorStatus = 400 | 404 | 409;

export interface ApiErrorBody {
	error: {
		code: string;
		message: string;
		details: ApiFieldError[];
	};
}

export class ApiError extends Error {
	readonly status: ApiErrorStatus;
	readonly code: string;
	readonly details: readonly ApiFieldError[];

	constructor(status: ApiErrorStatus, code: string, message: string, details: readonly ApiFieldError[] = []) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

export function toErrorBody(error: ApiError): ApiErrorBody {
	return {
		error: {
			code: error.code,
			message: error.message,
			details: error.details.map((detail) => ({ field: detail.field, message: detail.message })),
		},
	};
}
