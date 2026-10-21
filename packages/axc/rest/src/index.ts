import { type ApiErrorBody, type ApplicationServicesFactory, type CourseQueryInput, type EnrollmentResult, invalidRequestError } from '@axc/application-services';
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
		const result = applicationServices.courses.list(toQuery(c.req.queries()));
		if (!result.ok) {
			return c.json({ error: result.error }, 400);
		}
		return c.json(result.page);
	});

	app.post('/api/enrollment-requests', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		const body = await readJsonBody(c);
		if (!body.ok) {
			return body.response;
		}
		return sendEnrollmentResult(c, applicationServices.enrollmentRequests.create(body.value), 201);
	});

	app.get('/api/enrollment-requests', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		return sendEnrollmentResult(c, applicationServices.enrollmentRequests.list(toQuery(c.req.queries())), 200);
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		return sendEnrollmentResult(c, applicationServices.enrollmentRequests.getById(c.req.param('id')), 200);
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		const body = await readJsonBody(c);
		if (!body.ok) {
			return body.response;
		}
		return sendEnrollmentResult(c, applicationServices.enrollmentRequests.updateStatus(c.req.param('id'), body.value), 200);
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};

function toQuery(queries: Record<string, string[]>): CourseQueryInput {
	return queries;
}

async function applicationServicesFor(c: Context, applicationServicesFactory: ApplicationServicesFactory) {
	const authorization = c.req.header('Authorization');
	return authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
}

async function readJsonBody(c: Context): Promise<{ ok: true; value: unknown } | { ok: false; response: Response }> {
	try {
		return { ok: true, value: await c.req.json() };
	} catch {
		return {
			ok: false,
			response: c.json({ error: invalidRequestError([{ field: 'body', message: 'Request body must be a JSON object.' }]) }, 400),
		};
	}
}

function sendEnrollmentResult<T>(c: Context, result: EnrollmentResult<T>, successStatus: 200 | 201): Response {
	if (!result.ok) {
		return c.json({ error: result.error }, httpStatus(result.error.code));
	}
	return c.json(result.value, successStatus);
}

function httpStatus(code: ApiErrorBody['code']): 400 | 404 | 409 {
	switch (code) {
		case 'COURSE_NOT_FOUND':
		case 'ENROLLMENT_REQUEST_NOT_FOUND':
			return 404;
		case 'COURSE_NOT_ACTIVE':
		case 'DUPLICATE_ACTIVE_REQUEST':
		case 'INVALID_STATUS_TRANSITION':
			return 409;
		case 'INVALID_REQUEST':
			return 400;
	}
}
