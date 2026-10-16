import type { Context } from 'hono';
export class RequestValidationError extends Error {
	readonly code: 'INVALID_QUERY_PARAMETER' | 'INVALID_REQUEST';
	readonly details: { field: string; message: string }[];
	constructor(code: 'INVALID_QUERY_PARAMETER' | 'INVALID_REQUEST', field: string, message: string) {
		super(message);
		this.code = code;
		this.details = [{ field, message }];
	}
}
export function optionalQuery(value: string | undefined): string | undefined {
	if (value === undefined || value.trim().length === 0) {
		return undefined;
	}
	return value;
}
export function queryEnum<T extends string>(value: string | undefined, allowed: readonly T[], field: string, code: 'INVALID_QUERY_PARAMETER' | 'INVALID_REQUEST'): T | undefined {
	const supplied = optionalQuery(value);
	if (supplied === undefined) {
		return undefined;
	}
	const match = allowed.find((candidate) => candidate === supplied);
	if (match === undefined) {
		throw new RequestValidationError(code, field, `${field} must be one of: ${allowed.join(', ')}.`);
	}
	return match;
}
export async function jsonObject(context: Context): Promise<Record<string, unknown>> {
	let value: unknown;
	try {
		value = await context.req.json<unknown>();
	} catch {
		throw new RequestValidationError('INVALID_REQUEST', 'body', 'body must be a JSON object.');
	}
	if (value === null || typeof value !== 'object' || Array.isArray(value)) {
		throw new RequestValidationError('INVALID_REQUEST', 'body', 'body must be a JSON object.');
	}
	return value as Record<string, unknown>;
}
export function requiredString(body: Record<string, unknown>, field: string): string {
	const value = body[field];
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new RequestValidationError('INVALID_REQUEST', field, `${field} must be a non-empty string.`);
	}
	return value.trim();
}
