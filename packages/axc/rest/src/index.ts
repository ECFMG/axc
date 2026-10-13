import type { ApplicationServices, ApplicationServicesFactory } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		const outcome = applicationServices.courses.search(c.req.queries());
		if (!outcome.ok) {
			return c.json({ error: outcome.error }, 400);
		}
		return c.json(outcome.page);
	});

	return app;
}

async function applicationServicesFor(c: Context, applicationServicesFactory: ApplicationServicesFactory): Promise<ApplicationServices> {
	const authorization = c.req.header('Authorization');
	if (authorization === undefined) {
		return await applicationServicesFactory.forRequest();
	}
	return await applicationServicesFactory.forRequest(authorization);
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
