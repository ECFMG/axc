import { type ApplicationServices, type ApplicationServicesFactory, parseCourseQuery } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	const servicesFor = (authorization: string | undefined): Promise<ApplicationServices> => (authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization));

	app.get('/health', async (c) => {
		const applicationServices = await servicesFor(c.req.header('Authorization'));
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const parsed = parseCourseQuery(c.req.query());
		if (!parsed.ok) {
			return c.json(parsed.error, 400);
		}
		const applicationServices = await servicesFor(c.req.header('Authorization'));
		return c.json(applicationServices.courses.search(parsed.criteria));
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
