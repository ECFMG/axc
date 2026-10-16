export class ApplicationError extends Error {
	readonly status: 400 | 404 | 409;
	readonly code: string;
	readonly field: string | undefined;
	constructor(status: 400 | 404 | 409, code: string, message: string, field?: string) {
		super(message);
		this.status = status;
		this.code = code;
		this.field = field;
	}
}
