type CatalogErrorCode = 'COURSE_NOT_FOUND' | 'COURSE_NOT_ACTIVE' | 'DUPLICATE_ACTIVE_REQUEST' | 'ENROLLMENT_REQUEST_NOT_FOUND' | 'INVALID_STATUS_TRANSITION';
export class CatalogError extends Error {
	readonly code: CatalogErrorCode;
	constructor(code: CatalogErrorCode, message: string) {
		super(message);
		this.code = code;
	}
}
export class CatalogValidationError extends Error {
	readonly details: { field: string; message: string }[];
	constructor(details: { field: string; message: string }[]) {
		super('The request could not be completed.');
		this.details = details;
	}
}
