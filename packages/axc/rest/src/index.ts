import { type ApplicationServices, type ApplicationServicesFactory, courseQueryErrorResponse, parseCourseQuery } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';

function servicesFor(applicationServicesFactory: ApplicationServicesFactory, c: Context): Promise<ApplicationServices> {
	const authorization = c.req.header('Authorization');
	return authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);
}

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const applicationServices = await servicesFor(applicationServicesFactory, c);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const parsed = parseCourseQuery(c.req.query());
		if (!parsed.ok) {
			return c.json(courseQueryErrorResponse(parsed.errors), 400);
		}
		const applicationServices = await servicesFor(applicationServicesFactory, c);
		return c.json(applicationServices.courses.search(parsed.query));
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
