import { type ApplicationServicesFactory, QueryValidationError } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const applicationServices = await resolveApplicationServices(c, applicationServicesFactory);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const applicationServices = await resolveApplicationServices(c, applicationServicesFactory);
		try {
			return c.json(applicationServices.courses.search(c.req.query()));
		} catch (error) {
			if (error instanceof QueryValidationError) {
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

function resolveApplicationServices(c: Context, applicationServicesFactory: ApplicationServicesFactory) {
	const authorization = c.req.header('Authorization');
	return authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);
}
