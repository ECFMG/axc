export interface ErrorDetail {
	field: string;
	message: string;
}

/** A business-rule failure; `code` is the stable API error code, mapped to HTTP by the rest layer. */
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

export const invalidRequest = (details: ErrorDetail[]): DomainError => new DomainError('INVALID_REQUEST', 'The request could not be completed.', details);
