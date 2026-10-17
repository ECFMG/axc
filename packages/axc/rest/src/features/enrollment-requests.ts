import type { ApplicationServicesFactory } from '@axc/application-services';
import type { Hono } from 'hono';
import { body, errorResponse } from './errors.ts';
export function registerEnrollmentRequests(app: Hono, factory: ApplicationServicesFactory): void {
	app.post('/api/enrollment-requests', async (c) => {
		try {
			const request = await body(c);
			const services = await factory.forRequest();
			const result = await services.Catalog.EnrollmentRequest.create({ courseId: request['courseId'] as string, learnerEmail: request['learnerEmail'] as string, justification: request['justification'] as string });
			return c.json(result, 201);
		} catch (error) {
			return errorResponse(c, error);
		}
	});
	app.get('/api/enrollment-requests', async (c) => {
		try {
			const services = await factory.forRequest();
			return c.json(await services.Catalog.EnrollmentRequest.list(c.req.query()));
		} catch (error) {
			return errorResponse(c, error);
		}
	});
	app.get('/api/enrollment-requests/:id', async (c) => {
		try {
			const services = await factory.forRequest();
			return c.json(await services.Catalog.EnrollmentRequest.getById(c.req.param('id')));
		} catch (error) {
			return errorResponse(c, error);
		}
	});
	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		try {
			const request = await body(c);
			const services = await factory.forRequest();
			return c.json(
				await services.Catalog.EnrollmentRequest.updateStatus({
					id: c.req.param('id'),
					status: request['status'] as string,
					changedBy: request['changedBy'] as string,
					...(request['reason'] !== undefined ? { reason: request['reason'] as string } : {}),
				}),
			);
		} catch (error) {
			return errorResponse(c, error);
		}
	});
}
