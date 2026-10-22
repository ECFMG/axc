import { ApiError, type ApplicationServices, type ApplicationServicesFactory, invalidRequest, type QueryParameters } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { type Context, Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.onError((error, c) => {
		if (error instanceof ApiError) {
			return c.json({ error: { code: error.code, message: error.message, details: error.details } }, error.status);
		}
		return c.json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } }, 500);
	});

	const servicesFor = (c: Context): Promise<ApplicationServices> => {
		const authorization = c.req.header('Authorization');
		return authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);
	};

	app.get('/health', async (c) => {
		const applicationServices = await servicesFor(c);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const applicationServices = await servicesFor(c);
		return c.json(applicationServices.courses.search(queryParameters(c)));
	});

	app.post('/api/enrollment-requests', async (c) => {
		const applicationServices = await servicesFor(c);
		return c.json(applicationServices.enrollmentRequests.create(await readJson(c)));
	});

	app.get('/api/enrollment-requests', async (c) => {
		const applicationServices = await servicesFor(c);
		return c.json(applicationServices.enrollmentRequests.list(queryParameters(c)));
	});

	app.get('/api/enrollment-requests/:id', async (c) => {
		const applicationServices = await servicesFor(c);
		return c.json(applicationServices.enrollmentRequests.getById(c.req.param('id')));
	});

	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const applicationServices = await servicesFor(c);
		return c.json(applicationServices.enrollmentRequests.updateStatus(c.req.param('id'), await readJson(c)));
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};

function queryParameters(c: Context): QueryParameters {
	const query: Record<string, readonly string[]> = {};
	for (const [key, values] of Object.entries(c.req.queries())) {
		query[key] = values;
	}
	return query;
}

async function readJson(c: Context): Promise<unknown> {
	const text = await c.req.text();
	if (text.trim() === '') {
		throw invalidRequest([{ field: 'body', message: 'Request body must be a JSON object.' }]);
	}
	try {
		return JSON.parse(text) as unknown;
	} catch {
		throw invalidRequest([{ field: 'body', message: 'Request body must be valid JSON.' }]);
	}
}
