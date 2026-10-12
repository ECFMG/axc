import { type ApplicationServicesFactory, ServiceError } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	const services = (c: Context) => {
		const authorization = c.req.header('Authorization');
		return authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);
	};

	// Malformed JSON is reported by the service layer as a missing-fields problem.
	const body = (c: Context) => c.req.json().catch(() => undefined);

	app.get('/health', async (c) => c.json((await services(c)).health.getStatus()));

	app.get('/api/courses', async (c) => c.json(await (await services(c)).courses.search(c.req.query())));

	app.post('/api/enrollment-requests', async (c) => c.json(await (await services(c)).enrollmentRequests.create(await body(c)), 201));

	app.get('/api/enrollment-requests', async (c) => c.json(await (await services(c)).enrollmentRequests.list(c.req.query())));

	app.get('/api/enrollment-requests/:id', async (c) => c.json(await (await services(c)).enrollmentRequests.getById(c.req.param('id'))));

	app.patch('/api/enrollment-requests/:id/status', async (c) => c.json(await (await services(c)).enrollmentRequests.updateStatus(c.req.param('id'), await body(c))));

	app.onError((error, c) => {
		if (error instanceof ServiceError) {
			return c.json({ error: { code: error.code, message: error.message, details: error.details } }, error.status as ContentfulStatusCode);
		}
		return c.json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } }, 500);
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
