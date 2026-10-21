import type { ApplicationServicesFactory, CourseQueryInput } from '@axc/application-services';
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
		const result = applicationServices.courses.list(toCourseQuery(c.req.queries()));
		if (!result.ok) {
			return c.json({ error: result.error }, 400);
		}
		return c.json(result.page);
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};

function toCourseQuery(queries: Record<string, string[]>): CourseQueryInput {
	return queries;
}

async function applicationServicesFor(c: Context, applicationServicesFactory: ApplicationServicesFactory) {
	const authorization = c.req.header('Authorization');
	return authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
}
