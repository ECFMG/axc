import { type ApplicationServicesFactory, DomainError } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const ERROR_STATUS: Record<string, ContentfulStatusCode> = {
	COURSE_NOT_FOUND: 404,
	ENROLLMENT_REQUEST_NOT_FOUND: 404,
	COURSE_NOT_ACTIVE: 409,
	DUPLICATE_ACTIVE_REQUEST: 409,
	INVALID_STATUS_TRANSITION: 409,
};

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	const services = (c: Context) => {
		const authorization = c.req.header('Authorization');
		return authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);
	};
	const body = (c: Context): Promise<unknown> => c.req.json().catch(() => undefined);

	app.get('/health', async (c) => c.json((await services(c)).health.getStatus()));

	app.get('/api/courses', async (c) => c.json(await (await services(c)).courses.search(c.req.query())));

	app.post('/api/enrollment-requests', async (c) => c.json(await (await services(c)).enrollmentRequests.create(await body(c)), 201));
	app.get('/api/enrollment-requests', async (c) => c.json({ items: await (await services(c)).enrollmentRequests.list(c.req.query()) }));
	app.get('/api/enrollment-requests/:id', async (c) => c.json(await (await services(c)).enrollmentRequests.getById(c.req.param('id'))));
	app.patch('/api/enrollment-requests/:id/status', async (c) => c.json(await (await services(c)).enrollmentRequests.updateStatus(c.req.param('id'), await body(c))));

	app.onError((err, c) => {
		if (!(err instanceof DomainError)) throw err;
		return c.json({ error: { code: err.code, message: err.message, details: err.details } }, ERROR_STATUS[err.code] ?? 400);
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
