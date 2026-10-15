import type { ApplicationServicesFactory } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';
import { registerCourseRoutes } from './courses.ts';

export { parseCourseQuery, registerCourseRoutes } from './courses.ts';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	registerCourseRoutes(app, applicationServicesFactory);

	app.get('/health', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(applicationServices.health.getStatus());
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
