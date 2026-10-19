import { type ApplicationServices, type ApplicationServicesFactory, CatalogError, type CatalogErrorCode, type CatalogErrorDetail, type CoursePage } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';

const httpStatusByCode: Record<CatalogErrorCode, 400 | 404 | 409> = {
	INVALID_QUERY_PARAMETER: 400,
	INVALID_REQUEST: 400,
	COURSE_NOT_FOUND: 404,
	ENROLLMENT_REQUEST_NOT_FOUND: 404,
	COURSE_NOT_ACTIVE: 409,
	DUPLICATE_ACTIVE_REQUEST: 409,
	INVALID_STATUS_TRANSITION: 409,
};

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const services = await servicesFor(applicationServicesFactory, c);
		return c.json(services.health.getStatus());
	});

	app.get('/api/courses', (c) =>
		respond(c, applicationServicesFactory, async (services) => {
			const page: CoursePage = await services.courses.search({
				q: c.req.query('q'),
				modality: c.req.query('modality'),
				status: c.req.query('status'),
				tag: c.req.query('tag'),
				page: c.req.query('page'),
				pageSize: c.req.query('pageSize'),
				sort: c.req.query('sort'),
			});
			return c.json(page);
		}),
	);

	app.post('/api/enrollment-requests', (c) => respond(c, applicationServicesFactory, async (services) => c.json(await services.enrollmentRequests.create(await c.req.json()), 201)));

	app.get('/api/enrollment-requests', (c) =>
		respond(c, applicationServicesFactory, async (services) =>
			c.json(
				await services.enrollmentRequests.list({
					status: c.req.query('status'),
					courseId: c.req.query('courseId'),
					learnerEmail: c.req.query('learnerEmail'),
				}),
			),
		),
	);

	app.get('/api/enrollment-requests/:id', (c) => respond(c, applicationServicesFactory, async (services) => c.json(await services.enrollmentRequests.getById(c.req.param('id')))));

	app.patch('/api/enrollment-requests/:id/status', (c) => respond(c, applicationServicesFactory, async (services) => c.json(await services.enrollmentRequests.updateStatus(c.req.param('id'), await c.req.json()))));

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};

function servicesFor(factory: ApplicationServicesFactory, c: Context): Promise<ApplicationServices> {
	const authorization = c.req.header('Authorization');
	return authorization === undefined ? factory.forRequest() : factory.forRequest(authorization);
}

async function respond(c: Context, factory: ApplicationServicesFactory, action: (services: ApplicationServices) => Promise<Response>): Promise<Response> {
	try {
		return await action(await servicesFor(factory, c));
	} catch (error) {
		return catalogFailure(c, error);
	}
}

function catalogFailure(c: Context, error: unknown): Response {
	if (error instanceof CatalogError) {
		const details: readonly CatalogErrorDetail[] = error.details;
		const status: Record<CatalogErrorCode, 400 | 404 | 409>[CatalogErrorCode] = httpStatusByCode[error.code];
		return c.json({ error: { code: error.code, message: error.message, details } }, status);
	}
	if (error instanceof SyntaxError) {
		return c.json({ error: { code: 'INVALID_REQUEST', message: 'The request could not be completed.', details: [{ field: 'body', message: 'Request body must be JSON.' }] } }, 400);
	}
	return c.json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } }, 500);
}
