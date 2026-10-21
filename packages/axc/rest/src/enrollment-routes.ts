import { type ApplicationServicesFactory, EnrollmentError } from '@axc/application-services';
import type { Context, Hono } from 'hono';

async function jsonBody(c: Context): Promise<unknown> {
	try {
		return await c.req.json();
	} catch {
		throw new EnrollmentError(400, 'INVALID_REQUEST', 'The request could not be completed.', [{ field: 'body', message: 'body must be valid JSON.' }]);
	}
}
export function registerEnrollmentRoutes(app: Hono, factory: ApplicationServicesFactory): void {
	async function service(c: Context) {
		const header = c.req.header('Authorization');
		return (header === undefined ? await factory.forRequest() : await factory.forRequest(header)).enrollmentRequests;
	}
	app.post('/api/enrollment-requests', async (c) => {
		const input = await jsonBody(c);
		const result = (await service(c)).create(input);
		c.header('Location', `/api/enrollment-requests/${result.id}`);
		return c.json(result, 201);
	});
	app.get('/api/enrollment-requests', async (c) => {
		const params = new URL(c.req.url).searchParams;
		const filters: Record<string, unknown> = {};
		for (const [field, value] of params) {
			if (!['status', 'courseId', 'learnerEmail'].includes(field) || params.getAll(field).length > 1) {
				throw new EnrollmentError(400, 'INVALID_REQUEST', 'The request could not be completed.', [{ field, message: `${field} must be a supported filter supplied at most once.` }]);
			}
			filters[field] = value;
		}
		return c.json((await service(c)).list(filters));
	});
	app.get('/api/enrollment-requests/:id', async (c) => c.json((await service(c)).get(c.req.param('id'))));
	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		const input = await jsonBody(c);
		return c.json((await service(c)).changeStatus(c.req.param('id'), input));
	});
}
