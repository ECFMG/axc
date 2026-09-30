import type { ApplicationServicesFactory } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const applicationServices = await servicesFor(applicationServicesFactory, c.req.header('Authorization'));
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const applicationServices = await servicesFor(applicationServicesFactory, c.req.header('Authorization'));
		const outcome = applicationServices.courses.search(c.req.queries());
		if (outcome.status === 'invalid') {
			return c.json(outcome.error, 400);
		}
		return c.json(outcome.body);
	});

	return app;
}

function servicesFor(applicationServicesFactory: ApplicationServicesFactory, authorization: string | undefined) {
	return authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
