import type { ApplicationServicesFactory } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	const servicesFor = (authorization: string | undefined) => (authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization));

	app.get('/health', async (c) => {
		const applicationServices = await servicesFor(c.req.header('Authorization'));
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const applicationServices = await servicesFor(c.req.header('Authorization'));
		const result = applicationServices.courses.search(c.req.query());
		if (!result.ok) {
			return c.json({ error: result.error }, 400);
		}
		return c.json(result.body);
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
