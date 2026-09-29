import { type ApplicationServicesFactory, type CourseListQueryInput, InvalidQueryParameterError } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);

		try {
			return c.json(applicationServices.courses.list(readCourseListQuery(c)));
		} catch (error) {
			if (error instanceof InvalidQueryParameterError) {
				return c.json(
					{
						error: {
							code: error.code,
							message: error.message,
							details: error.details,
						},
					},
					400,
				);
			}
			throw error;
		}
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};

function readCourseListQuery(c: { req: { query: (name: string) => string | undefined } }): CourseListQueryInput {
	const query: CourseListQueryInput = {};
	assignQueryParam(query, 'q', c.req.query('q'));
	assignQueryParam(query, 'modality', c.req.query('modality'));
	assignQueryParam(query, 'status', c.req.query('status'));
	assignQueryParam(query, 'tag', c.req.query('tag'));
	assignQueryParam(query, 'page', c.req.query('page'));
	assignQueryParam(query, 'pageSize', c.req.query('pageSize'));
	assignQueryParam(query, 'sort', c.req.query('sort'));
	return query;
}

function assignQueryParam(query: CourseListQueryInput, field: keyof CourseListQueryInput, value: string | undefined): void {
	if (value !== undefined) {
		query[field] = value;
	}
}
