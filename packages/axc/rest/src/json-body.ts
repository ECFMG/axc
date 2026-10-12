/** Request body parsing that reports malformed JSON through the domain error contract. */

import { invalidRequest } from '@axc/domain';
import type { Context } from 'hono';

/**
 * Parses the request body as JSON.
 *
 * @throws AxcDomainError `INVALID_REQUEST` when the body is absent or is not valid JSON.
 */
export async function readJsonBody(c: Context): Promise<unknown> {
	try {
		return await c.req.json();
	} catch {
		throw invalidRequest([{ field: 'body', message: 'The request body must be a JSON object.' }]);
	}
}
