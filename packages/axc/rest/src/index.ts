import { type ApplicationServices, type ApplicationServicesFactory, DomainError } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

const statusFor = (code: string): ContentfulStatusCode => {
	if (code.startsWith('INVALID_') && code !== 'INVALID_STATUS_TRANSITION') return 400;
	if (code.endsWith('_NOT_FOUND')) return 404;
	return 409;
};

const readJson = (c: Context): Promise<unknown> => c.req.json().catch(() => undefined);

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	const services = (c: Context): Promise<ApplicationServices> => {
		const authorization = c.req.header('Authorization');
		return authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);
	};

	app.onError((err, c) => {
		if (err instanceof DomainError) return c.json({ error: { code: err.code, message: err.message, details: err.details } }, statusFor(err.code));
		throw err;
	});

	app.get('/health', async (c) => c.json((await services(c)).health.getStatus()));
	app.get('/api/courses', async (c) => c.json(await (await services(c)).courses.search(c.req.query())));
	app.post('/api/enrollment-requests', async (c) => c.json(await (await services(c)).enrollmentRequests.create(await readJson(c)), 201));
	app.get('/api/enrollment-requests', async (c) => c.json(await (await services(c)).enrollmentRequests.list(c.req.query())));
	app.get('/api/enrollment-requests/:id', async (c) => c.json(await (await services(c)).enrollmentRequests.getById(c.req.param('id'))));
	app.patch('/api/enrollment-requests/:id/status', async (c) => c.json(await (await services(c)).enrollmentRequests.changeStatus(c.req.param('id'), await readJson(c))));

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
