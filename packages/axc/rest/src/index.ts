import { type ApplicationServicesFactory, DomainError } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const STATUS_BY_CODE: Record<DomainError['code'], ContentfulStatusCode> = {
	INVALID_QUERY_PARAMETER: 400,
	INVALID_REQUEST: 400,
	COURSE_NOT_FOUND: 404,
	ENROLLMENT_REQUEST_NOT_FOUND: 404,
	COURSE_NOT_ACTIVE: 409,
	DUPLICATE_ACTIVE_REQUEST: 409,
	INVALID_STATUS_TRANSITION: 409,
};

/** Malformed JSON becomes undefined so the service reports it as INVALID_REQUEST. */
const jsonBody = (c: Context): Promise<unknown> => c.req.json().catch(() => undefined);

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	const services = (c: Context) => {
		const authorization = c.req.header('Authorization');
		return authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);
	};

	app.onError((error, c) => {
		if (!(error instanceof DomainError)) throw error;
		return c.json({ error: { code: error.code, message: error.message, details: error.details } }, STATUS_BY_CODE[error.code]);
	});

	app.get('/health', async (c) => c.json((await services(c)).health.getStatus()));
	app.get('/api/courses', async (c) => c.json(await (await services(c)).courses.search(c.req.query())));
	app.post('/api/enrollment-requests', async (c) => c.json(await (await services(c)).enrollmentRequests.create(await jsonBody(c)), 201));
	app.get('/api/enrollment-requests', async (c) => c.json(await (await services(c)).enrollmentRequests.list(c.req.query())));
	app.get('/api/enrollment-requests/:id', async (c) => c.json(await (await services(c)).enrollmentRequests.getById(c.req.param('id'))));
	app.patch('/api/enrollment-requests/:id/status', async (c) => c.json(await (await services(c)).enrollmentRequests.changeStatus(c.req.param('id'), await jsonBody(c))));

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
