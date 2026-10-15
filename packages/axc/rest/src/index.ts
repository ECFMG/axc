import type { ApplicationServices, ApplicationServicesFactory, ServiceResult } from '@axc/application-services';
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
		return respond(c, await applicationServices.courses.search(c.req.query()));
	});

	app.post('/api/enrollment-requests', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		return respond(c, await applicationServices.enrollmentRequests.create(await readJson(c)), 201);
	});

	app.get('/api/enrollment-requests', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		return respond(c, await applicationServices.enrollmentRequests.list(c.req.query()));
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		return respond(c, await applicationServices.enrollmentRequests.getById(c.req.param('id')));
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		return respond(c, await applicationServices.enrollmentRequests.updateStatus(c.req.param('id'), await readJson(c)));
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};

async function applicationServicesFor(c: Context, applicationServicesFactory: ApplicationServicesFactory): Promise<ApplicationServices> {
	const authorization = c.req.header('Authorization');
	return authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
}

async function readJson(c: Context): Promise<unknown> {
	try {
		return await c.req.json();
	} catch {
		return undefined;
	}
}

function respond(c: Context, result: ServiceResult<unknown>, successStatus: 200 | 201 = 200) {
	if (!result.ok) {
		return c.json(
			{
				error: {
					code: result.error.code,
					message: result.error.message,
					details: result.error.details,
				},
			},
			result.error.status,
		);
	}
	return c.json(result.value, successStatus);
}
