import { type ApplicationServicesFactory, type InvalidCourseQuery, parseCourseQuery } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const applicationServices = await openApplicationServices(applicationServicesFactory, c.req.header('Authorization'));
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const applicationServices = await openApplicationServices(applicationServicesFactory, c.req.header('Authorization'));
		const parsed = parseCourseQuery(c.req.queries());
		if (!parsed.ok) {
			const error: InvalidCourseQuery = parsed.error;
			return c.json(error, 400);
		}
		return c.json(await applicationServices.courses.search(parsed.query));
	});

	return app;
}

function openApplicationServices(applicationServicesFactory: ApplicationServicesFactory, authorization: string | undefined) {
	if (authorization === undefined) {
		return applicationServicesFactory.forRequest();
	}
	return applicationServicesFactory.forRequest(authorization);
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
