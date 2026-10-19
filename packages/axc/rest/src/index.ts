import { type ApplicationServices, type ApplicationServicesFactory, BODY_FIELD, type EnrollmentError, type EnrollmentErrorCode, type EnrollmentOutcome, invalidRequest, type QueryParameterError } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export const INVALID_QUERY_PARAMETER_CODE = 'INVALID_QUERY_PARAMETER' as const;
export const INVALID_QUERY_PARAMETER_MESSAGE = 'One or more query parameters are invalid.' as const;

export interface ErrorResponse {
	error: {
		code: typeof INVALID_QUERY_PARAMETER_CODE;
		message: string;
		details: QueryParameterError[];
	};
}

export interface EnrollmentErrorResponse {
	error: EnrollmentError;
}

/** HTTP status for each enrollment error code. */
export const ENROLLMENT_ERROR_STATUS: Readonly<Record<EnrollmentErrorCode, ContentfulStatusCode>> = {
	INVALID_REQUEST: 400,
	COURSE_NOT_FOUND: 404,
	ENROLLMENT_REQUEST_NOT_FOUND: 404,
	COURSE_NOT_ACTIVE: 409,
	DUPLICATE_ACTIVE_REQUEST: 409,
	INVALID_STATUS_TRANSITION: 409,
};

const invalidQueryResponse = (details: QueryParameterError[]): ErrorResponse => ({
	error: {
		code: INVALID_QUERY_PARAMETER_CODE,
		message: INVALID_QUERY_PARAMETER_MESSAGE,
		details,
	},
});

const servicesForRequest = (applicationServicesFactory: ApplicationServicesFactory, authorization: string | undefined): Promise<ApplicationServices> =>
	authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);

type JsonBody = { ok: true; value: unknown } | { ok: false; error: EnrollmentError };

/** Reads the request body as JSON. An empty or malformed body is an INVALID_REQUEST error. */
async function readJsonBody(c: Context): Promise<JsonBody> {
	const text = await c.req.text();
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch {
		return { ok: false, error: invalidRequest([{ field: BODY_FIELD, message: 'The request body must be valid JSON.' }]) };
	}
}

const respond = <T>(c: Context, outcome: EnrollmentOutcome<T>, successStatus: ContentfulStatusCode = 200): Response =>
	outcome.ok ? c.json(outcome.result as object, successStatus) : c.json<EnrollmentErrorResponse>({ error: outcome.error }, ENROLLMENT_ERROR_STATUS[outcome.error.code]);

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	const services = (c: Context): Promise<ApplicationServices> => servicesForRequest(applicationServicesFactory, c.req.header('Authorization'));

	app.get('/health', async (c) => {
		const applicationServices = await services(c);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const applicationServices = await services(c);
		const outcome = await applicationServices.courses.search(c.req.queries());
		return outcome.ok ? c.json(outcome.result, 200) : c.json(invalidQueryResponse(outcome.errors), 400);
	});

	app.post('/api/enrollment-requests', async (c) => {
		const body = await readJsonBody(c);
		if (!body.ok) {
			return respond(c, body);
		}
		const applicationServices = await services(c);
		return respond(c, await applicationServices.enrollmentRequests.create(body.value), 201);
	});

	app.get('/api/enrollment-requests', async (c) => {
		const applicationServices = await services(c);
		return respond(c, await applicationServices.enrollmentRequests.list(c.req.queries()));
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const applicationServices = await services(c);
		return respond(c, await applicationServices.enrollmentRequests.getById(c.req.param('id')));
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const body = await readJsonBody(c);
		if (!body.ok) {
			return respond(c, body);
		}
		const applicationServices = await services(c);
		return respond(c, await applicationServices.enrollmentRequests.updateStatus(c.req.param('id'), body.value));
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
