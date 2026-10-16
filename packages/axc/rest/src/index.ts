import type { ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';
import { registerCourses, registerEnrollmentRequests } from './contexts/index.ts';
import { RequestValidationError } from './contexts/validation.ts';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	app.onError((error, context) => {
		if (error instanceof RequestValidationError) {
			const message = error.code === 'INVALID_QUERY_PARAMETER' ? 'One or more query parameters are invalid.' : 'The request could not be completed.';
			return context.json({ error: { code: error.code, message, details: error.details } }, 400);
		}
		if (error instanceof Domain.Contexts.Training.EnrollmentRequest.EnrollmentError) {
			const status = error.code === 'INVALID_REQUEST' ? 400 : error.code === 'COURSE_NOT_FOUND' || error.code === 'ENROLLMENT_REQUEST_NOT_FOUND' ? 404 : 409;
			return context.json({ error: { code: error.code, message: 'The request could not be completed.', details: error.details } }, status);
		}
		return context.json({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.', details: [] } }, 500);
	});
	registerCourses(app, applicationServicesFactory);
	registerEnrollmentRequests(app, applicationServicesFactory);

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
