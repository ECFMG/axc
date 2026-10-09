import { CatalogError, CatalogValidationError } from '@axc/application-services';
import type { Context } from 'hono';
export interface Detail {
	field: string;
	message: string;
}
interface RequestObject {
	courseId?: unknown;
	learnerEmail?: unknown;
	justification?: unknown;
	status?: unknown;
	changedBy?: unknown;
	reason?: unknown;
}
export const invalid = (c: Context, code: 'INVALID_REQUEST' | 'INVALID_QUERY_PARAMETER', details: Detail[]): Response =>
	c.json({ error: { code, message: code === 'INVALID_REQUEST' ? 'The request could not be completed.' : 'One or more query parameters are invalid.', details } }, 400);
export const failure = (c: Context, error: unknown): Response => {
	if (error instanceof CatalogValidationError) return invalid(c, 'INVALID_REQUEST', error.details);
	if (error instanceof CatalogError) {
		const status = error.code === 'COURSE_NOT_FOUND' || error.code === 'ENROLLMENT_REQUEST_NOT_FOUND' ? 404 : 409;
		return c.json({ error: { code: error.code, message: error.message, details: [] } }, status);
	}
	throw error;
};
export const readObject = async (c: Context): Promise<RequestObject | null> => {
	try {
		const body: unknown = await c.req.json();
		return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as RequestObject) : null;
	} catch {
		return null;
	}
};
export const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
