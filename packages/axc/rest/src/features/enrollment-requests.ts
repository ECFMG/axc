import type { ApplicationServicesFactory, EnrollmentRequestCreateCommand, EnrollmentRequestStatusCommand } from '@axc/application-services';
import { ApplicationError } from '@axc/application-services';
import type { Context, Hono } from 'hono';
import { errorResponse } from './errors.ts';

const body = async (c: Context): Promise<Record<string, unknown>> => {
	try {
		const value: unknown = await c.req.json();
		if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
	} catch {
		/* mapped below */
	}
	throw new ApplicationError(400, 'INVALID_REQUEST', 'A JSON object body is required.');
};
export const registerEnrollmentRequestRoutes = (app: Hono, factory: ApplicationServicesFactory): void => {
	app.post('/api/enrollment-requests', async (c) => {
		try {
			const input = await body(c);
			const services = await factory.forRequest(c.req.header('Authorization'));
			return c.json(await services.Training.EnrollmentRequest.create(input as unknown as EnrollmentRequestCreateCommand), 201);
		} catch (error) {
			return errorResponse(c, error);
		}
	});
	app.get('/api/enrollment-requests', async (c) => {
		try {
			const services = await factory.forRequest(c.req.header('Authorization'));
			return c.json(await services.Training.EnrollmentRequest.list(c.req.query()));
		} catch (error) {
			return errorResponse(c, error);
		}
	});
	app.get('/api/enrollment-requests/:id', async (c) => {
		try {
			const services = await factory.forRequest(c.req.header('Authorization'));
			return c.json(await services.Training.EnrollmentRequest.getById(c.req.param('id')));
		} catch (error) {
			return errorResponse(c, error);
		}
	});
	app.patch('/api/enrollment-requests/:id/status', async (c) => {
		try {
			const input = await body(c);
			const services = await factory.forRequest(c.req.header('Authorization'));
			return c.json(await services.Training.EnrollmentRequest.changeStatus({ ...input, id: c.req.param('id') } as unknown as EnrollmentRequestStatusCommand));
		} catch (error) {
			return errorResponse(c, error);
		}
	});
};
