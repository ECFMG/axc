import { ApplicationFailure } from '@axc/application-services';
import type { Context } from 'hono';

const statuses: Record<string, 400 | 404 | 409> = {
	INVALID_REQUEST: 400,
	INVALID_QUERY_PARAMETER: 400,
	COURSE_NOT_FOUND: 404,
	COURSE_NOT_ACTIVE: 409,
	DUPLICATE_ACTIVE_REQUEST: 409,
	ENROLLMENT_REQUEST_NOT_FOUND: 404,
	INVALID_STATUS_TRANSITION: 409,
};
export const respondToError = (c: Context, error: unknown): Response => {
	if (error instanceof ApplicationFailure) return c.json({ error: { code: error.code, message: error.message, details: error.details } }, statuses[error.code] ?? 400);
	throw error;
};
interface RequestBody {
	courseId?: unknown;
	learnerEmail?: unknown;
	justification?: unknown;
	status?: unknown;
	changedBy?: unknown;
	reason?: unknown;
	[key: string]: unknown;
}
export const body = async (c: Context): Promise<RequestBody> => {
	try {
		const value: unknown = await c.req.json();
		if (value && typeof value === 'object' && !Array.isArray(value)) return value as RequestBody;
	} catch {
		/* mapped below */
	}
	throw new ApplicationFailure('INVALID_REQUEST', 'The request could not be completed.', [{ field: 'body', message: 'A JSON object is required.' }]);
};
export const stringField = (value: unknown): string => (typeof value === 'string' ? value : '');
