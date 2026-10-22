import type { ApplicationServicesFactory } from '@axc/application-services';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export interface FieldError {
	field: string;
	message: string;
}

/** Every error body has the same shape: { error: { code, message, details } }. */
export const errorResponse = (c: Context, status: ContentfulStatusCode, code: string, message: string, details: FieldError[] = []): Response => c.json({ error: { code, message, details } }, status);

export const servicesFor = (c: Context, factory: ApplicationServicesFactory) => {
	const authorization = c.req.header('Authorization');
	return authorization === undefined ? factory.forRequest() : factory.forRequest(authorization);
};

/** Rejects unknown and repeated query parameters, then returns the first value of each (trimmed). */
export function readQuery(query: Record<string, string[]>, allowed: readonly string[], errors: FieldError[]): Record<string, string | undefined> {
	for (const [field, values] of Object.entries(query)) {
		if (!allowed.includes(field)) {
			errors.push({ field, message: `${field} is not a supported query parameter.` });
		} else if (values.length > 1) {
			errors.push({ field, message: `${field} may only be given once.` });
		}
	}
	return Object.fromEntries(Object.entries(query).map(([field, values]) => [field, values[0]?.trim()]));
}

export function positiveInteger(raw: string | undefined, fallback: number, field: string, max: number, errors: FieldError[]): number {
	if (raw === undefined) {
		return fallback;
	}
	const value = Number(raw);
	if (!/^\d+$/.test(raw) || value < 1 || value > max) {
		errors.push({ field, message: max === Number.MAX_SAFE_INTEGER ? `${field} must be a positive integer.` : `${field} must be an integer between 1 and ${max}.` });
	}
	return value;
}

/** Returns the value when it is one of the allowed literals; records an error for any other non-undefined value. */
export function oneOf<T extends string>(raw: string | undefined, allowed: readonly T[], field: string, errors: FieldError[]): T | undefined {
	if (raw === undefined) {
		return undefined;
	}
	const match = allowed.find((candidate) => candidate === raw);
	if (match === undefined) {
		errors.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	}
	return match;
}
