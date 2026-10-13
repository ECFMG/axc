export interface ErrorDetail {
	field: string;
	message: string;
}

/** Rule violation carrying the API error code; delivery layers map `code` to an HTTP status. */
export class DomainError extends Error {
	readonly code: string;
	readonly details: ErrorDetail[];

	constructor(code: string, message: string, details: ErrorDetail[] = []) {
		super(message);
		this.name = 'DomainError';
		this.code = code;
		this.details = details;
	}
}

export const invalid = (field: string, message: string): DomainError => new DomainError('INVALID_REQUEST', 'The request could not be completed.', [{ field, message }]);
