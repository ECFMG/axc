import { ApplicationError, type ApplicationServicesFactory, type CourseListQueryInput, type EnrollmentRequestListQueryInput, InvalidQueryParameterError } from '@axc/application-services';
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
		const applicationServices = await servicesFor(c, applicationServicesFactory);
		return handleApplicationResult(c, () => applicationServices.courses.list(readCourseListQuery(c)));
	});

	app.post('/api/enrollment-requests', async (c) => {
		const applicationServices = await servicesFor(c, applicationServicesFactory);
		return handleApplicationResult(c, async () => applicationServices.enrollmentRequests.create(await readJsonBody(c)), 201);
	});

	app.get('/api/enrollment-requests', async (c) => {
		const applicationServices = await servicesFor(c, applicationServicesFactory);
		return handleApplicationResult(c, () => applicationServices.enrollmentRequests.list(readEnrollmentRequestListQuery(c)));
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const applicationServices = await servicesFor(c, applicationServicesFactory);
		return handleApplicationResult(c, () => applicationServices.enrollmentRequests.getById(c.req.param('id')));
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const applicationServices = await servicesFor(c, applicationServicesFactory);
		return handleApplicationResult(c, async () => applicationServices.enrollmentRequests.updateStatus(c.req.param('id'), await readJsonBody(c)));
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};

async function servicesFor(c: Context, applicationServicesFactory: ApplicationServicesFactory) {
	const authorization = c.req.header('Authorization');
	return authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
}

async function handleApplicationResult(c: Context, run: () => unknown | Promise<unknown>, successStatus: 200 | 201 = 200) {
	try {
		const result = await run();
		return c.json(result, successStatus);
	} catch (error) {
		if (error instanceof InvalidQueryParameterError) {
			return c.json(toErrorBody(error.code, error.message, error.details), 400);
		}
		if (error instanceof ApplicationError) {
			return c.json(toErrorBody(error.code, error.message, error.details), error.httpStatus);
		}
		throw error;
	}
}

function toErrorBody(code: string, message: string, details: Array<{ field: string; message: string }>) {
	return {
		error: {
			code,
			message,
			details,
		},
	};
}

async function readJsonBody(c: Context): Promise<unknown> {
	try {
		return await c.req.json();
	} catch {
		throw new ApplicationError('INVALID_REQUEST', 'The request could not be completed.', 400, [{ field: 'body', message: 'Request body must be valid JSON.' }]);
	}
}

function readCourseListQuery(c: Context): CourseListQueryInput {
	const query: CourseListQueryInput = {};
	assignQueryParam(query, 'q', c.req.query('q'));
	assignQueryParam(query, 'modality', c.req.query('modality'));
	assignQueryParam(query, 'status', c.req.query('status'));
	assignQueryParam(query, 'tag', c.req.query('tag'));
	assignQueryParam(query, 'page', c.req.query('page'));
	assignQueryParam(query, 'pageSize', c.req.query('pageSize'));
	assignQueryParam(query, 'sort', c.req.query('sort'));
	return query;
}

function readEnrollmentRequestListQuery(c: Context): EnrollmentRequestListQueryInput {
	const query: EnrollmentRequestListQueryInput = {};
	assignEnrollmentQueryParam(query, 'status', c.req.query('status'));
	assignEnrollmentQueryParam(query, 'courseId', c.req.query('courseId'));
	assignEnrollmentQueryParam(query, 'learnerEmail', c.req.query('learnerEmail'));
	return query;
}

function assignQueryParam(query: CourseListQueryInput, field: keyof CourseListQueryInput, value: string | undefined): void {
	if (value !== undefined) {
		query[field] = value;
	}
}

function assignEnrollmentQueryParam(query: EnrollmentRequestListQueryInput, field: keyof EnrollmentRequestListQueryInput, value: string | undefined): void {
	if (value !== undefined) {
		query[field] = value;
	}
}
