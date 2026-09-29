import type { ApplicationServices, ApplicationServicesFactory } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';

const resolveApplicationServices = (applicationServicesFactory: ApplicationServicesFactory, c: Context): Promise<ApplicationServices> => {
	const authorization = c.req.header('Authorization');
	return authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);
};

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const applicationServices = await resolveApplicationServices(applicationServicesFactory, c);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const applicationServices = await resolveApplicationServices(applicationServicesFactory, c);
		// Only the supported parameters are forwarded; anything else in the query string is ignored.
		const outcome = await applicationServices.courses.search({
			q: c.req.query('q'),
			modality: c.req.query('modality'),
			status: c.req.query('status'),
			tag: c.req.query('tag'),
			page: c.req.query('page'),
			pageSize: c.req.query('pageSize'),
			sort: c.req.query('sort'),
		});
		return outcome.ok ? c.json(outcome.result) : c.json(outcome.error, 400);
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
