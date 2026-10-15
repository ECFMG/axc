import type { ApplicationServicesFactory, QueryParameterError } from '@axc/application-services';
import type { Hono } from 'hono';
import { resolveApplicationServices } from './request-services.ts';

/** Route the course catalog is served from. Matches the `api/courses` Azure Function route. */
const COURSES_ROUTE = '/api/courses';

const INVALID_QUERY_PARAMETER_CODE = 'INVALID_QUERY_PARAMETER';
const INVALID_QUERY_PARAMETER_MESSAGE = 'One or more query parameters are invalid.';

interface ApiErrorBody {
	readonly error: {
		readonly code: string;
		readonly message: string;
		readonly details: readonly QueryParameterError[];
	};
}

/**
 * Registers `GET /api/courses` on a Hono app.
 *
 * @remarks
 * The route is a thin adapter: it hands the raw query string to the application
 * service and translates the returned outcome into either `200` with the page of
 * results or `400` with the shared error envelope. A query that matches nothing is a
 * successful empty page, not an error.
 *
 * @param app - Hono app to register the route on.
 * @param applicationServicesFactory - Factory injected by the composition root.
 */
export function registerCourseRoutes(app: Hono, applicationServicesFactory: ApplicationServicesFactory): void {
	app.get(COURSES_ROUTE, async (c) => {
		const applicationServices = await resolveApplicationServices(applicationServicesFactory, c.req.header('Authorization'));
		const outcome = await applicationServices.courses.search(c.req.query());

		if (!outcome.ok) {
			return c.json(invalidQueryParameterBody(outcome.errors), 400);
		}
		return c.json(outcome.result);
	});
}

function invalidQueryParameterBody(errors: readonly QueryParameterError[]): ApiErrorBody {
	return {
		error: {
			code: INVALID_QUERY_PARAMETER_CODE,
			message: INVALID_QUERY_PARAMETER_MESSAGE,
			details: errors.map((error) => ({ field: error.field, message: error.message })),
		},
	};
}
