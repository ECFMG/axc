export interface ApiErrorDetail {
	field: string;
	message: string;
}

const INVALID_REQUEST_CODE = 'INVALID_REQUEST' as const;
const INVALID_REQUEST_MESSAGE = 'The request could not be completed.' as const;

export interface ApiErrorBody {
	code: 'INVALID_REQUEST' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';
	message: string;
	details: ApiErrorDetail[];
}

export function invalidRequestError(details: readonly ApiErrorDetail[]): ApiErrorBody {
	return {
		code: INVALID_REQUEST_CODE,
		message: INVALID_REQUEST_MESSAGE,
		details: [...details],
	};
}
