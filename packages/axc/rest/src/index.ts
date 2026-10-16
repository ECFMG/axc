import { type ApplicationServicesFactory, CatalogError } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	const services = () => applicationServicesFactory.forRequest();
	app.onError((error, c) => {
		if (error instanceof CatalogError) return c.json({ error: { code: error.code, message: error.message, details: error.details } }, error.status as 400 | 404 | 409);
		return c.json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } }, 500);
	});
	const body = async (c: { req: { json(): Promise<unknown> } }): Promise<unknown> => {
		try {
			return await c.req.json();
		} catch {
			throw new CatalogError(400, 'INVALID_REQUEST', 'A valid JSON body is required.', [{ field: 'body', message: 'A valid JSON body is required.' }]);
		}
	};
	app.get('/api/courses', async (c) => c.json((await services()).catalog.searchCourses(new URL(c.req.url).searchParams)));
	app.post('/api/enrollment-requests', async (c) => c.json((await services()).catalog.createRequest(await body(c)), 201));
	app.get('/api/enrollment-requests', async (c) => c.json((await services()).catalog.listRequests(new URL(c.req.url).searchParams)));
	app.get('/api/enrollment-requests/:id', async (c) => c.json((await services()).catalog.getRequest(c.req.param('id'))));
	app.patch('/api/enrollment-requests/:id/status', async (c) => c.json((await services()).catalog.changeStatus(c.req.param('id'), await body(c))));

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
