import { ApplicationError } from '@axc/application-services';
import type { Context } from 'hono';
export function errorResponse(c: Context, error: unknown): Response {
	if (error instanceof ApplicationError) {
		const status = ({ INVALID_QUERY_PARAMETER: 400, INVALID_REQUEST: 400, COURSE_NOT_FOUND: 404, COURSE_NOT_ACTIVE: 409, DUPLICATE_ACTIVE_REQUEST: 409, ENROLLMENT_REQUEST_NOT_FOUND: 404, INVALID_STATUS_TRANSITION: 409 } as const)[
			error.code
		];
		return c.json({ error: { code: error.code, message: error.message, details: error.details } }, status);
	}
	return c.json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } }, 500);
}
export async function body(c: Context): Promise<Record<string, unknown>> {
	try {
		const value: unknown = await c.req.json();
		return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}
