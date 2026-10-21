export interface FieldError {
	field: string;
	message: string;
}

export interface AppError {
	code: 'INVALID_QUERY_PARAMETER' | 'INVALID_REQUEST' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';
	message: string;
	details: FieldError[];
}

export type AppResult<T> = { ok: true; value: T } | { ok: false; error: AppError };

export function fail(code: AppError['code'], message: string, details: FieldError[] = []): AppResult<never> {
	return { ok: false, error: { code, message, details } };
}
