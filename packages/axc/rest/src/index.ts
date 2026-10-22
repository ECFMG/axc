import { ApplicationError, type ApplicationServicesFactory, type FieldError, type RawQuery } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const applicationServices = await servicesFor(c, applicationServicesFactory);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		try {
			const applicationServices = await servicesFor(c, applicationServicesFactory);
			const page = await applicationServices.courses.search(asQuery(c.req.queries()));
			return c.json(page);
		} catch (error) {
			return failure(c, error);
		}
	});

	app.get('/api/enrollment-requests', async (c) => {
		try {
			const applicationServices = await servicesFor(c, applicationServicesFactory);
			const page = await applicationServices.enrollmentRequests.list(asQuery(c.req.queries()));
			return c.json(page);
		} catch (error) {
			return failure(c, error);
		}
	});

	app.post('/api/enrollment-requests', async (c) => {
		try {
			const applicationServices = await servicesFor(c, applicationServicesFactory);
			const created = await applicationServices.enrollmentRequests.create(await readJson(c));
			return c.json(created, 201);
		} catch (error) {
			return failure(c, error);
		}
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		try {
			const applicationServices = await servicesFor(c, applicationServicesFactory);
			const request = await applicationServices.enrollmentRequests.getById(c.req.param('id'));
			return c.json(request);
		} catch (error) {
			return failure(c, error);
		}
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		try {
			const applicationServices = await servicesFor(c, applicationServicesFactory);
			const updated = await applicationServices.enrollmentRequests.updateStatus(c.req.param('id'), await readJson(c));
			return c.json(updated);
		} catch (error) {
			return failure(c, error);
		}
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};

async function servicesFor(c: Context, applicationServicesFactory: ApplicationServicesFactory) {
	const authorization = c.req.header('Authorization');
	if (authorization === undefined) {
		return await applicationServicesFactory.forRequest();
	}
	return await applicationServicesFactory.forRequest(authorization);
}

async function readJson(c: Context): Promise<unknown> {
	try {
		return await c.req.json();
	} catch {
		throw new ApplicationError('INVALID_REQUEST', 'The request could not be completed.', [{ field: 'body', message: 'Request body must be JSON.' }]);
	}
}

function asQuery(query: Record<string, string[]>): RawQuery {
	return query;
}

function failure(c: Context, error: unknown): Response {
	if (!(error instanceof ApplicationError)) {
		throw error;
	}
	const details: readonly FieldError[] = error.details;
	return c.json(
		{
			error: {
				code: error.code,
				message: error.message,
				details,
			},
		},
		HTTP_STATUS[error.code],
	);
}

const HTTP_STATUS = {
	INVALID_QUERY_PARAMETER: 400,
	INVALID_REQUEST: 400,
	COURSE_NOT_FOUND: 404,
	ENROLLMENT_REQUEST_NOT_FOUND: 404,
	COURSE_NOT_ACTIVE: 409,
	DUPLICATE_ACTIVE_REQUEST: 409,
	INVALID_STATUS_TRANSITION: 409,
} as const satisfies Record<ApplicationError['code'], 400 | 404 | 409>;
