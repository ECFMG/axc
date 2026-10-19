import { type ApplicationServices, type ApplicationServicesFactory, malformedEnrollmentRequestBody } from '@axc/application-services';
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
		const outcome = applicationServices.courses.search(c.req.queries());
		if (!outcome.ok) {
			return c.json({ error: outcome.error }, 400);
		}
		return c.json(outcome.page);
	});

	app.post('/api/enrollment-requests', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		const body = await readJsonBody(c);
		if (!body.ok) {
			const failure = malformedEnrollmentRequestBody();
			return c.json({ error: failure.error }, failure.status);
		}
		const outcome = applicationServices.enrollmentRequests.create(body.value);
		if (!outcome.ok) {
			return c.json({ error: outcome.error }, outcome.status);
		}
		return c.json(outcome.request, 201);
	});

	app.get('/api/enrollment-requests', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		const outcome = applicationServices.enrollmentRequests.list(c.req.queries());
		if (!outcome.ok) {
			return c.json({ error: outcome.error }, outcome.status);
		}
		return c.json({ items: outcome.items });
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		const outcome = applicationServices.enrollmentRequests.getById(c.req.param('id'));
		if (!outcome.ok) {
			return c.json({ error: outcome.error }, outcome.status);
		}
		return c.json(outcome.request);
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const applicationServices = await applicationServicesFor(c, applicationServicesFactory);
		const body = await readJsonBody(c);
		if (!body.ok) {
			const failure = malformedEnrollmentRequestBody();
			return c.json({ error: failure.error }, failure.status);
		}
		const outcome = applicationServices.enrollmentRequests.updateStatus(c.req.param('id'), body.value);
		if (!outcome.ok) {
			return c.json({ error: outcome.error }, outcome.status);
		}
		return c.json(outcome.request);
	});

	return app;
}

async function readJsonBody(c: Context): Promise<{ readonly ok: true; readonly value: unknown } | { readonly ok: false }> {
	try {
		return { ok: true, value: await c.req.json() };
	} catch {
		return { ok: false };
	}
}

async function applicationServicesFor(c: Context, applicationServicesFactory: ApplicationServicesFactory): Promise<ApplicationServices> {
	const authorization = c.req.header('Authorization');
	if (authorization === undefined) {
		return await applicationServicesFactory.forRequest();
	}
	return await applicationServicesFactory.forRequest(authorization);
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
