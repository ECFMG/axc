import type { TrainingApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';
import { createCourseRoutes, createEnrollmentRequestRoutes } from './contexts/index.ts';
import { HttpInputError } from './validation.ts';

export function createRestApp(applicationServicesFactory: TrainingApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(applicationServices.health.getStatus());
	});

	app.route('/api/courses', createCourseRoutes(applicationServicesFactory));
	app.route('/api/enrollment-requests', createEnrollmentRequestRoutes(applicationServicesFactory));
	app.onError((error, c) => {
		if (error instanceof HttpInputError) {
			return c.json({ error: { code: error.code, message: error.message, details: error.details } }, 400);
		}
		if (error instanceof Domain.Contexts.Training.EnrollmentRequest.EnrollmentWorkflowError) {
			const status = error.code === 'INVALID_REQUEST' ? 400 : error.code === 'COURSE_NOT_FOUND' || error.code === 'ENROLLMENT_REQUEST_NOT_FOUND' ? 404 : 409;
			return c.json({ error: { code: error.code, message: 'The request could not be completed.', details: [{ field: error.field, message: error.message }] } }, status);
		}
		console.error('Training API request failed', error);
		return c.json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } }, 500);
	});
	return app;
}

export const restHandlerCreator = (applicationServicesFactory: TrainingApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
