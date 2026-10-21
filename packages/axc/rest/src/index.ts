import { type ApplicationServicesFactory, EnrollmentError } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';
import { parseCourseQuery } from './course-query.ts';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	app.onError((error, c) => {
		if (error instanceof EnrollmentError) return c.json({ error: { code: error.code, message: error.message, details: error.details } }, error.status);
		return c.json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } }, 500);
	});
	const services = (authorization: string | undefined) => (authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization));
	async function body(request: { json(): Promise<unknown> }): Promise<unknown> {
		try {
			return await request.json();
		} catch {
			throw new EnrollmentError('INVALID_REQUEST', 400, 'The request could not be completed.', [{ field: 'body', message: 'A valid JSON body is required.' }]);
		}
	}
	app.get('/api/courses', async (c) => {
		const { query, issues } = parseCourseQuery(new URL(c.req.url).searchParams);
		if (issues.length) return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: issues } }, 400);
		return c.json((await services(c.req.header('Authorization'))).courses.search(query));
	});
	app.post('/api/enrollment-requests', async (c) => {
		const input = await body(c.req);
		return c.json((await services(c.req.header('Authorization'))).enrollments.create(input), 201);
	});
	app.get('/api/enrollment-requests', async (c) => {
		const params = new URL(c.req.url).searchParams;
		for (const field of ['status', 'courseId', 'learnerEmail']) {
			if (params.getAll(field).length > 1) throw new EnrollmentError('INVALID_REQUEST', 400, 'The request could not be completed.', [{ field, message: `${field} must be supplied at most once.` }]);
		}
		return c.json((await services(c.req.header('Authorization'))).enrollments.list(Object.fromEntries(params)));
	});
	app.get('/api/enrollment-requests/:id', async (c) => c.json((await services(c.req.header('Authorization'))).enrollments.get(c.req.param('id'))));
	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const input = await body(c.req);
		return c.json((await services(c.req.header('Authorization'))).enrollments.changeStatus(c.req.param('id'), input));
	});

	app.get('/health', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(applicationServices.health.getStatus());
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
