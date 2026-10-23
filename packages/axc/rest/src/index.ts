import type { ApplicationServicesFactory, EnrollmentRequestOutcome } from '@axc/application-services';
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
		const result = applicationServices.courses.search({
			q: c.req.query('q'),
			modality: c.req.query('modality'),
			status: c.req.query('status'),
			tag: c.req.query('tag'),
			page: c.req.query('page'),
			pageSize: c.req.query('pageSize'),
			sort: c.req.query('sort'),
		});

		if (!result.ok) {
			return c.json({ error: result.error }, 400);
		}

		return c.json(result.value);
	});

	app.post('/api/enrollment-requests', async (c) => {
		const applicationServices = await servicesFor(c, applicationServicesFactory);
		const result = applicationServices.enrollmentRequests.create(await readJsonBody(c));
		return jsonOutcome(c, result, 201);
	});

	app.get('/api/enrollment-requests', async (c) => {
		const applicationServices = await servicesFor(c, applicationServicesFactory);
		const result = applicationServices.enrollmentRequests.list({
			status: c.req.query('status'),
			courseId: c.req.query('courseId'),
			learnerEmail: c.req.query('learnerEmail'),
		});
		return jsonOutcome(c, result, 200);
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const applicationServices = await servicesFor(c, applicationServicesFactory);
		const result = applicationServices.enrollmentRequests.getById(c.req.param('id'));
		return jsonOutcome(c, result, 200);
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const applicationServices = await servicesFor(c, applicationServicesFactory);
		const result = applicationServices.enrollmentRequests.updateStatus(c.req.param('id'), await readJsonBody(c));
		return jsonOutcome(c, result, 200);
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

async function readJsonBody(c: Context): Promise<unknown> {
	try {
		return await c.req.json();
	} catch {
		return undefined;
	}
}

function jsonOutcome<T>(c: Context, result: EnrollmentRequestOutcome<T>, successStatus: 200 | 201) {
	if (!result.ok) {
		return c.json({ error: result.error }, result.status);
	}

	return c.json(result.value, successStatus);
}
