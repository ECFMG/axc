import type { ApplicationServicesFactory, CourseSearchFieldError, CourseSearchQueryInput } from '@axc/application-services';
import type { Context, Hono } from 'hono';
import { applicationServicesFor } from '../request-scope.ts';

const INVALID_QUERY_PARAMETER_CODE = 'INVALID_QUERY_PARAMETER';
const INVALID_QUERY_PARAMETER_MESSAGE = 'One or more query parameters are invalid.';

/** Registers `GET /api/courses`, the course catalog search endpoint. */
export function registerCourseSearchRoute(app: Hono, applicationServicesFactory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		const result = await applicationServices.courses.search(readCourseSearchQuery(c));

		if (result.outcome === 'invalid-query') {
			return c.json(invalidQueryParameterBody(result.errors), 400);
		}

		return c.json(result.page);
	});
}

function readCourseSearchQuery(c: Context): CourseSearchQueryInput {
	return {
		q: c.req.query('q'),
		modality: c.req.query('modality'),
		status: c.req.query('status'),
		tag: c.req.query('tag'),
		page: c.req.query('page'),
		pageSize: c.req.query('pageSize'),
		sort: c.req.query('sort'),
	};
}

function invalidQueryParameterBody(details: readonly CourseSearchFieldError[]) {
	return {
		error: {
			code: INVALID_QUERY_PARAMETER_CODE,
			message: INVALID_QUERY_PARAMETER_MESSAGE,
			details,
		},
	};
}
