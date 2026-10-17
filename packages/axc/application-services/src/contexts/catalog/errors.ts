type ApplicationErrorCode = 'INVALID_QUERY_PARAMETER' | 'INVALID_REQUEST' | 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';
export class ApplicationError extends Error {
	readonly code: ApplicationErrorCode;
	readonly details: readonly { field: string; message: string }[];
	constructor(code: ApplicationErrorCode, message: string, details: readonly { field: string; message: string }[] = []) {
		super(message);
		this.code = code;
		this.details = details;
	}
}
export const invalid = (field: string, message: string) => new ApplicationError('INVALID_REQUEST', 'The request could not be completed.', [{ field, message }]);
