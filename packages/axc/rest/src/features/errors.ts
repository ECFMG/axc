import { ApplicationError } from '@axc/application-services';
import type { Context } from 'hono';
export const errorResponse = (c: Context, error: unknown): Response => {
	if (error instanceof ApplicationError) {
		const message = error.code === 'INVALID_QUERY_PARAMETER' ? 'One or more query parameters are invalid.' : error.status === 400 ? 'The request could not be completed.' : error.message;
		return c.json({ error: { code: error.code, message, details: error.field ? [{ field: error.field, message: error.message }] : [] } }, error.status);
	}
	throw error;
};
