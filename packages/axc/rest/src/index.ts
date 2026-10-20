import type { ApplicationServicesFactory } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const applicationServices = await applicationServicesFor(applicationServicesFactory, c.req.header('Authorization'));
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const applicationServices = await applicationServicesFor(applicationServicesFactory, c.req.header('Authorization'));
		const result = await applicationServices.courses.list(c.req.queries());
		if (!result.ok) {
			return c.json({ error: result.error }, 400);
		}
		return c.json(result.body);
	});

	return app;
}

function applicationServicesFor(applicationServicesFactory: ApplicationServicesFactory, authorization: string | undefined) {
	if (authorization === undefined) {
		return applicationServicesFactory.forRequest();
	}
	return applicationServicesFactory.forRequest(authorization);
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
