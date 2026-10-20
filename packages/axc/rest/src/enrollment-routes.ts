import { type ApplicationServicesFactory, EnrollmentError, type EnrollmentFilters } from '@axc/application-services';
import { type Context, Hono } from 'hono';

async function body(c: Context): Promise<unknown> {
	try {
		return await c.req.json();
	} catch {
		throw new EnrollmentError('INVALID_REQUEST', 400, 'The request could not be completed.', [{ field: 'body', message: 'body must contain valid JSON.' }]);
	}
}
export function enrollmentRoutes(app: Hono, factory: ApplicationServicesFactory): void {
	const routes = new Hono();
	routes.onError((error, c) => {
		if (error instanceof EnrollmentError) return c.json({ error: { code: error.code, message: error.message, details: error.details } }, error.status);
		console.error(error);
		return c.json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } }, 500);
	});
	const services = async (c: Context) => (await factory.forRequest(c.req.header('Authorization'))).enrollmentRequests;
	routes.post('/', async (c) => c.json((await services(c)).create(await body(c)), 201));
	routes.get('/', async (c) => {
		const params = new URL(c.req.url).searchParams;
		const filters: Record<string, string> = {};
		for (const field of ['status', 'courseId', 'learnerEmail']) {
			if (params.getAll(field).length > 1 || (params.has(field) && !params.get(field)?.trim())) {
				throw new EnrollmentError('INVALID_REQUEST', 400, 'The request could not be completed.', [{ field, message: `${field} must be a single non-empty value.` }]);
			}
			if (params.has(field)) filters[field] = params.get(field)?.trim() ?? '';
		}
		return c.json((await services(c)).list(filters as EnrollmentFilters));
	});
	routes.get('/:id', async (c) => c.json((await services(c)).get(c.req.param('id'))));
	routes.patch('/:id/status', async (c) => c.json((await services(c)).changeStatus(c.req.param('id'), await body(c))));
	app.route('/api/enrollment-requests', routes);
}
