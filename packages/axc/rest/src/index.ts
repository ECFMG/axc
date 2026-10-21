import type { AppError, ApplicationServicesFactory, AppResult, FieldError } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';

const httpStatus: Record<AppError['code'], 400 | 404 | 409> = {
	INVALID_QUERY_PARAMETER: 400,
	INVALID_REQUEST: 400,
	COURSE_NOT_FOUND: 404,
	COURSE_NOT_ACTIVE: 409,
	DUPLICATE_ACTIVE_REQUEST: 409,
	ENROLLMENT_REQUEST_NOT_FOUND: 404,
	INVALID_STATUS_TRANSITION: 409,
};

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	const services = (c: Context) => {
		const authorization = c.req.header('Authorization');
		return authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);
	};

	app.get('/health', async (c) => {
		const applicationServices = await services(c);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const applicationServices = await services(c);
		return send(c, await applicationServices.courses.search(c.req.query()));
	});

	app.post('/api/enrollment-requests', async (c) => {
		const body = await readBody(c);
		if (!body.ok) {
			return body.response;
		}
		const applicationServices = await services(c);
		return send(c, await applicationServices.enrollmentRequests.create(body.value), 201);
	});

	app.get('/api/enrollment-requests', async (c) => {
		const applicationServices = await services(c);
		return send(c, await applicationServices.enrollmentRequests.list(c.req.query()));
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const applicationServices = await services(c);
		return send(c, await applicationServices.enrollmentRequests.getById(c.req.param('id')));
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const body = await readBody(c);
		if (!body.ok) {
			return body.response;
		}
		const applicationServices = await services(c);
		return send(c, await applicationServices.enrollmentRequests.updateStatus(c.req.param('id'), body.value));
	});

	return app;
}

function send<T>(c: Context, result: AppResult<T>, successStatus: 200 | 201 = 200): Response {
	if (!result.ok) {
		return c.json(errorBody(result.error.code, result.error.message, result.error.details), httpStatus[result.error.code]);
	}
	return c.json(result.value, successStatus);
}

function errorBody(code: AppError['code'], message: string, details: FieldError[]) {
	return { error: { code, message, details } };
}

async function readBody(c: Context): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
	try {
		return { ok: true, value: await c.req.json() };
	} catch {
		return {
			ok: false,
			response: c.json(errorBody('INVALID_REQUEST', 'The request could not be completed.', [{ field: 'body', message: 'Request body must be JSON.' }]), 400),
		};
	}
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
