import type { ApplicationServicesFactory, CourseSearchFieldError, CourseSearchQueryInput } from '@axc/application-services';
import type { Context, Hono } from 'hono';
import { applicationServicesForRequest } from '../application-services-for-request.ts';

const INVALID_QUERY_PARAMETER = 'INVALID_QUERY_PARAMETER' as const;

/** Registers the course catalog routes on the REST app. */
export function registerCourseRoutes(app: Hono, applicationServicesFactory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const applicationServices = await applicationServicesForRequest(applicationServicesFactory, c);
		const result = await applicationServices.courses.search(courseSearchQuery(c));

		if (result.outcome === 'invalid') {
			return c.json(invalidQueryParameterBody(result.errors), 400);
		}

		return c.json(result.page);
	});
}

/** Reads only the supported query parameters. Anything else is ignored. */
function courseSearchQuery(c: Context): CourseSearchQueryInput {
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

function invalidQueryParameterBody(errors: readonly CourseSearchFieldError[]) {
	return {
		error: {
			code: INVALID_QUERY_PARAMETER,
			message: 'One or more query parameters are invalid.',
			details: errors.map(({ field, message }) => ({ field, message })),
		},
	};
}
