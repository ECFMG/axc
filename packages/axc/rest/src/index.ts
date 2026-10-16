import type { ApplicationServicesFactory } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';
import { courseQuery } from './course-query.ts';
import { enrollmentRequestCreate, enrollmentRequestGet, enrollmentRequestQuery, enrollmentRequestUpdateStatus } from './enrollment-requests.ts';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		const result = await courseQuery(applicationServices, c.req.queries());
		return c.json(result.body, result.status);
	});

	app.post('/api/enrollment-requests', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		const result = await enrollmentRequestCreate(applicationServices, () => c.req.json());
		return c.json(result.body, result.status);
	});

	app.get('/api/enrollment-requests', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		const result = await enrollmentRequestQuery(applicationServices, c.req.queries());
		return c.json(result.body, result.status);
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		const result = await enrollmentRequestGet(applicationServices, c.req.param('id'));
		return c.json(result.body, result.status);
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		const result = await enrollmentRequestUpdateStatus(applicationServices, c.req.param('id'), () => c.req.json());
		return c.json(result.body, result.status);
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
