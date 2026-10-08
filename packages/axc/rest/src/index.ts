import { type ApplicationServicesFactory, InvalidQueryParameterError } from '@axc/application-services';
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
			const result = await applicationServices.Catalog.Course.search({
				q: c.req.query('q'),
				modality: c.req.query('modality'),
				status: c.req.query('status'),
				tag: c.req.query('tag'),
				page: c.req.query('page'),
				pageSize: c.req.query('pageSize'),
				sort: c.req.query('sort'),
			});
			return c.json(result);
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
