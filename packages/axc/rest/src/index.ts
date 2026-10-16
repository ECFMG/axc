import { type ApplicationServicesFactory, EnrollmentWorkflowError, InvalidQueryParameterError } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';

async function resolveApplicationServices(c: Context, applicationServicesFactory: ApplicationServicesFactory) {
	const authorization = c.req.header('Authorization');
	return authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
}

function errorBody(error: { code: string; message: string; details: Array<{ field: string; message: string }> }) {
	return {
		error: {
			code: error.code,
			message: error.message,
			details: error.details,
		},
	};
}

function workflowStatus(status: number): 400 | 404 | 409 {
	if (status === 404) {
		return 404;
	}
	if (status === 409) {
		return 409;
	}
	return 400;
}

interface JsonObject {
	courseId?: unknown;
	learnerEmail?: unknown;
	justification?: unknown;
	status?: unknown;
	changedBy?: unknown;
	reason?: unknown;
}

async function readJsonBody(c: Context): Promise<JsonObject> {
	try {
		const body = await c.req.json();
		if (body === null || typeof body !== 'object' || Array.isArray(body)) {
			throw new Error('invalid body');
		}
		return body as JsonObject;
	} catch {
		throw new EnrollmentWorkflowError('INVALID_REQUEST', 'The request could not be completed.', 400, [{ field: 'body', message: 'Request body must be a JSON object.' }]);
	}
}

function optionalString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const applicationServices = await resolveApplicationServices(c, applicationServicesFactory);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const applicationServices = await resolveApplicationServices(c, applicationServicesFactory);

		try {
			const result = await applicationServices.Catalog.Course.search({
				q: c.req.query('q'),
				modality: c.req.query('modality'),
				status: c.req.query('status'),
				tag: c.req.query('tag'),
				page: c.req.query('page'),
				pageSize: c.req.query('pageSize'),
				sort: c.req.query('sort'),
			});
			return c.json(result);
		} catch (error) {
			if (error instanceof InvalidQueryParameterError) {
				return c.json(errorBody(error), 400);
			}
			throw error;
		}
	});

	app.post('/api/enrollment-requests', async (c) => {
		const applicationServices = await resolveApplicationServices(c, applicationServicesFactory);
		try {
			const body = await readJsonBody(c);
			const result = await applicationServices.Catalog.EnrollmentRequest.create({
				courseId: optionalString(body.courseId),
				learnerEmail: optionalString(body.learnerEmail),
				justification: optionalString(body.justification),
			});
			return c.json(result, 201);
		} catch (error) {
			if (error instanceof EnrollmentWorkflowError) {
				return c.json(errorBody(error), workflowStatus(error.httpStatus));
			}
			throw error;
		}
	});

	app.get('/api/enrollment-requests', async (c) => {
		const applicationServices = await resolveApplicationServices(c, applicationServicesFactory);
		try {
			const result = await applicationServices.Catalog.EnrollmentRequest.list({
				status: c.req.query('status'),
				courseId: c.req.query('courseId'),
				learnerEmail: c.req.query('learnerEmail'),
			});
			return c.json(result);
		} catch (error) {
			if (error instanceof EnrollmentWorkflowError) {
				return c.json(errorBody(error), workflowStatus(error.httpStatus));
			}
			throw error;
		}
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const applicationServices = await resolveApplicationServices(c, applicationServicesFactory);
		try {
			const result = await applicationServices.Catalog.EnrollmentRequest.getById({ id: c.req.param('id') });
			return c.json(result);
		} catch (error) {
			if (error instanceof EnrollmentWorkflowError) {
				return c.json(errorBody(error), workflowStatus(error.httpStatus));
			}
			throw error;
		}
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const applicationServices = await resolveApplicationServices(c, applicationServicesFactory);
		try {
			const body = await readJsonBody(c);
			const result = await applicationServices.Catalog.EnrollmentRequest.updateStatus({
				id: c.req.param('id'),
				status: optionalString(body.status),
				changedBy: optionalString(body.changedBy),
				reason: optionalString(body.reason),
			});
			return c.json(result);
		} catch (error) {
			if (error instanceof EnrollmentWorkflowError) {
				return c.json(errorBody(error), workflowStatus(error.httpStatus));
			}
			throw error;
		}
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
