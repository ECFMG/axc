interface FailureDetail {
	field: string;
	message: string;
}
export class ApplicationFailure extends Error {
	readonly code: string;
	readonly details: FailureDetail[];
	constructor(code: string, message: string, details: FailureDetail[] = []) {
		super(message);
		this.code = code;
		this.details = details;
	}
}
