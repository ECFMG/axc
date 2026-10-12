/** Maps domain errors onto the agentCourses HTTP error contract. */

import { AxcDomainError, type AxcErrorCode, type ErrorDetail } from '@axc/domain';
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/** HTTP status served for each domain error code. */
const STATUS_BY_ERROR_CODE: Readonly<Record<AxcErrorCode, ContentfulStatusCode>> = {
	INVALID_REQUEST: 400,
	INVALID_QUERY_PARAMETER: 400,
	COURSE_NOT_FOUND: 404,
	ENROLLMENT_REQUEST_NOT_FOUND: 404,
	COURSE_NOT_ACTIVE: 409,
	DUPLICATE_ACTIVE_REQUEST: 409,
	INVALID_STATUS_TRANSITION: 409,
};

/** Error body shared by every agentCourses endpoint. */
export interface ErrorResponseBody {
	readonly error: {
		readonly code: string;
		readonly message: string;
		readonly details: readonly ErrorDetail[];
	};
}

/** Renders any thrown value as the agentCourses error contract. */
export function errorResponse(c: Context, error: unknown): Response {
	if (error instanceof AxcDomainError) {
		return c.json(body(error.code, error.message, error.details), STATUS_BY_ERROR_CODE[error.code]);
	}
	return c.json(body('INTERNAL_ERROR', 'The request could not be completed.', []), 500);
}

function body(code: string, message: string, details: readonly ErrorDetail[]): ErrorResponseBody {
	return { error: { code, message, details } };
}
