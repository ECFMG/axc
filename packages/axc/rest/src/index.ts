import type { ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';
import { registerCourseRoutes, registerEnrollmentRequestRoutes } from './contexts/index.ts';
import { RequestValidationError } from './validation.ts';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	app.onError((error, c) => {
		if (error instanceof RequestValidationError) {
			return c.json(
				{ error: { code: error.query ? 'INVALID_QUERY_PARAMETER' : 'INVALID_REQUEST', message: error.query ? 'One or more query parameters are invalid.' : 'The request could not be completed.', details: error.details } },
				400,
			);
		}
		if (error instanceof Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestError) {
			const status = error.code === 'INVALID_REQUEST' ? 400 : error.code === 'COURSE_NOT_FOUND' || error.code === 'ENROLLMENT_REQUEST_NOT_FOUND' ? 404 : 409;
			return c.json({ error: { code: error.code, message: 'The request could not be completed.', details: error.details } }, status);
		}
		console.error('Training request failed', error);
		return c.json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } }, 500);
	});
	registerCourseRoutes(app, applicationServicesFactory);
	registerEnrollmentRequestRoutes(app, applicationServicesFactory);

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
