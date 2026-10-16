import type { Domain } from '@axc/domain';
export class RequestValidationError extends Error {
	readonly details: Domain.Contexts.Training.EnrollmentRequest.ValidationDetail[];
	readonly query: boolean;
	constructor(details: Domain.Contexts.Training.EnrollmentRequest.ValidationDetail[], query: boolean) {
		super('Invalid request');
		this.details = details;
		this.query = query;
	}
}
export const optionalText = (value: string | undefined): string | undefined => (value === undefined || value.trim() === '' ? undefined : value.trim());
interface JsonRequestBody {
	courseId?: unknown;
	learnerEmail?: unknown;
	justification?: unknown;
	status?: unknown;
	changedBy?: unknown;
	reason?: unknown;
}
export const readJsonObject = async (read: () => Promise<unknown>): Promise<JsonRequestBody> => {
	let value: unknown;
	try {
		value = await read();
	} catch {
		throw new RequestValidationError([{ field: 'body', message: 'body must be a JSON object.' }], false);
	}
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		throw new RequestValidationError([{ field: 'body', message: 'body must be a JSON object.' }], false);
	}
	return value as JsonRequestBody;
};
export const requireValid = (details: Domain.Contexts.Training.EnrollmentRequest.ValidationDetail[], query: boolean): void => {
	if (details.length > 0) {
		throw new RequestValidationError(details, query);
	}
};
export const parseEnum = <T extends string>(value: string | undefined, allowed: readonly T[], field: string, details: Domain.Contexts.Training.EnrollmentRequest.ValidationDetail[]): T | undefined => {
	const text = optionalText(value);
	if (text === undefined) {
		return undefined;
	}
	const result = allowed.find((item) => item === text);
	if (result === undefined) {
		details.push({ field, message: `${field} must be ${allowed.join(', ')}.` });
	}
	return result;
};
