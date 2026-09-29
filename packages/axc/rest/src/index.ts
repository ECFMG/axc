import type { ApplicationServices, ApplicationServicesFactory } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const applicationServices = await resolveApplicationServices(applicationServicesFactory, c);
		return c.json(applicationServices.health.getStatus());
	});

	// The Azure Functions host runs with an empty routePrefix, so the `/api` segment is part of the route itself.
	app.get('/api/courses', async (c) => {
		const applicationServices = await resolveApplicationServices(applicationServicesFactory, c);
		const outcome = await applicationServices.courseCatalog.search(c.req.query());
		if (outcome.status === 'invalid') {
			return c.json(outcome.error, 400);
		}
		return c.json(outcome.result);
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};

function resolveApplicationServices(applicationServicesFactory: ApplicationServicesFactory, c: Context): Promise<ApplicationServices> {
	const authorization = c.req.header('Authorization');
	return authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);
}
