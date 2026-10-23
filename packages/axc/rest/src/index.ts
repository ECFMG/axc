import { ApiError, type ApplicationServices, type ApplicationServicesFactory, toErrorBody } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => handle(c, applicationServicesFactory, 200, (services) => services.courses.search(c.req.queries())));

	app.post('/api/enrollment-requests', async (c) => {
		try {
			const body = await readJsonBody(c);
			const services = await applicationServicesFactory.forRequest();
			return c.json(services.enrollmentRequests.create(body), 201);
		} catch (error) {
			return respondWithError(c, error);
		}
	});

	app.get('/api/enrollment-requests', async (c) => handle(c, applicationServicesFactory, 200, (services) => services.enrollmentRequests.list(c.req.queries())));

	app.get('/api/enrollment-requests/:id', async (c) => handle(c, applicationServicesFactory, 200, (services) => services.enrollmentRequests.getById(requireId(c))));

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		try {
			const id = requireId(c);
			const body = await readJsonBody(c);
			const services = await applicationServicesFactory.forRequest();
			return c.json(services.enrollmentRequests.updateStatus(id, body), 200);
		} catch (error) {
			return respondWithError(c, error);
		}
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};

async function handle(c: Context, applicationServicesFactory: ApplicationServicesFactory, status: 200 | 201, action: (services: ApplicationServices) => unknown): Promise<Response> {
	try {
		const services = await applicationServicesFactory.forRequest();
		return c.json(action(services), status);
	} catch (error) {
		return respondWithError(c, error);
	}
}

async function readJsonBody(c: Context): Promise<unknown> {
	try {
		return await c.req.json();
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		throw new ApiError(400, 'INVALID_REQUEST', 'The request could not be completed.', [{ field: 'body', message: 'Request body must be valid JSON.' }]);
	}
}

function requireId(c: Context): string {
	const id = c.req.param('id');
	if (id === undefined || id.trim() === '') {
		throw new ApiError(404, 'ENROLLMENT_REQUEST_NOT_FOUND', 'The enrollment request does not exist.', [{ field: 'id', message: 'No enrollment request exists with the given id.' }]);
	}
	return id;
}

function respondWithError(c: Context, error: unknown): Response {
	if (error instanceof ApiError) {
		return c.json(toErrorBody(error), error.status);
	}
	throw error;
}
