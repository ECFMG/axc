import { ApplicationError, type ApplicationErrorCode, type ApplicationServicesFactory, type CourseSearchInput, type EnrollmentListInput } from '@axc/application-services';
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

	app.get('/api/courses', async (c) => {
		const applicationServices = await applicationServicesFactory.forRequest();
		return execute(c, 200, () => applicationServices.courses.search(courseSearchInput(c)));
	});

	app.post('/api/enrollment-requests', async (c) => {
		return await execute(c, 201, async () => {
			const applicationServices = await applicationServicesFactory.forRequest();
			const body = await readJsonBody(c);
			return applicationServices.enrollmentRequests.create(body);
		});
	});

	app.get('/api/enrollment-requests', async (c) => {
		const applicationServices = await applicationServicesFactory.forRequest();
		return execute(c, 200, () => applicationServices.enrollmentRequests.list(enrollmentListInput(c)));
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const applicationServices = await applicationServicesFactory.forRequest();
		return execute(c, 200, () => applicationServices.enrollmentRequests.getById(c.req.param('id')));
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		return await execute(c, 200, async () => {
			const applicationServices = await applicationServicesFactory.forRequest();
			const body = await readJsonBody(c);
			return applicationServices.enrollmentRequests.updateStatus(c.req.param('id'), body);
		});
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};

function courseSearchInput(c: Context): CourseSearchInput {
	const input: CourseSearchInput = {};
	const q = c.req.query('q');
	const modality = c.req.query('modality');
	const status = c.req.query('status');
	const tag = c.req.query('tag');
	const page = c.req.query('page');
	const pageSize = c.req.query('pageSize');
	const sort = c.req.query('sort');
	if (q !== undefined) {
		input.q = q;
	}
	if (modality !== undefined) {
		input.modality = modality;
	}
	if (status !== undefined) {
		input.status = status;
	}
	if (tag !== undefined) {
		input.tag = tag;
	}
	if (page !== undefined) {
		input.page = page;
	}
	if (pageSize !== undefined) {
		input.pageSize = pageSize;
	}
	if (sort !== undefined) {
		input.sort = sort;
	}
	return input;
}

function enrollmentListInput(c: Context): EnrollmentListInput {
	const input: EnrollmentListInput = {};
	const status = c.req.query('status');
	const courseId = c.req.query('courseId');
	const learnerEmail = c.req.query('learnerEmail');
	if (status !== undefined) {
		input.status = status;
	}
	if (courseId !== undefined) {
		input.courseId = courseId;
	}
	if (learnerEmail !== undefined) {
		input.learnerEmail = learnerEmail;
	}
	return input;
}

async function readJsonBody(c: Context): Promise<unknown> {
	try {
		return await c.req.json();
	} catch {
		throw new ApplicationError('INVALID_REQUEST', [{ field: 'body', message: 'Request body must be JSON.' }]);
	}
}

async function execute(c: Context, status: 200 | 201, produce: () => unknown | Promise<unknown>): Promise<Response> {
	try {
		return c.json(await produce(), status);
	} catch (error) {
		return errorResponse(c, error);
	}
}

function errorResponse(c: Context, error: unknown): Response {
	if (error instanceof ApplicationError) {
		return c.json({ error: { code: error.code, message: error.message, details: error.details } }, httpStatusFor(error.code));
	}
	throw error;
}

function httpStatusFor(code: ApplicationErrorCode): 400 | 404 | 409 {
	switch (code) {
		case 'COURSE_NOT_FOUND':
		case 'ENROLLMENT_REQUEST_NOT_FOUND':
			return 404;
		case 'COURSE_NOT_ACTIVE':
		case 'DUPLICATE_ACTIVE_REQUEST':
		case 'INVALID_STATUS_TRANSITION':
			return 409;
		default:
			return 400;
	}
}
