import { Domain } from '@axc/domain';
import type { Context } from 'hono';
export interface InvalidField {
	field: string;
	message: string;
}
export class HttpInputError extends Error {
	readonly details: InvalidField[];
	readonly code: 'INVALID_REQUEST' | 'INVALID_QUERY_PARAMETER';
	constructor(code: HttpInputError['code'], details: InvalidField[]) {
		super(code === 'INVALID_QUERY_PARAMETER' ? 'One or more query parameters are invalid.' : 'The request could not be completed.');
		this.code = code;
		this.details = details;
	}
}
export function optionalText(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed === '' ? undefined : trimmed;
}
export function enumValue<T extends string>(value: string | undefined, values: readonly T[], field: string, details: InvalidField[]): T | undefined {
	const text = optionalText(value);
	if (text === undefined) {
		return undefined;
	}
	const accepted = values.find((candidate) => candidate === text);
	if (accepted === undefined) {
		details.push({ field, message: `${field} must be one of: ${values.join(', ')}.` });
	}
	return accepted;
}
export async function objectBody(context: Context): Promise<Record<string, unknown>> {
	let body: unknown;
	try {
		body = await context.req.json();
	} catch {
		throw new HttpInputError('INVALID_REQUEST', [{ field: 'body', message: 'body must be a JSON object.' }]);
	}
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		throw new HttpInputError('INVALID_REQUEST', [{ field: 'body', message: 'body must be a JSON object.' }]);
	}
	return body as Record<string, unknown>;
}
export function requiredString(body: Record<string, unknown>, field: string, details: InvalidField[]): string | undefined {
	const value = body[field];
	if (typeof value !== 'string' || value.trim() === '') {
		details.push({ field, message: `${field} must be a non-empty string.` });
		return undefined;
	}
	return value.trim();
}
export function learnerEmail(value: string | undefined, details: InvalidField[]): void {
	if (value !== undefined && !Domain.Contexts.Training.EnrollmentRequest.isLearnerEmail(value)) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
	}
}
