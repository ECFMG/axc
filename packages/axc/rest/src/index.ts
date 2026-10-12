/**
 * agentCourses REST delivery layer.
 *
 * @remarks
 * Translates HTTP into application service calls and domain errors into the agentCourses error
 * contract. All business rules live in `@axc/application-services` and `@axc/domain`; this
 * package owns transport concerns only.
 */

import type { ApplicationServicesFactory } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';
import { errorResponse } from './error-handling.ts';
import { registerCourseRoutes, registerEnrollmentRequestRoutes, registerHealthRoutes, requestScopedServices } from './routes.ts';

export type { ErrorResponseBody } from './error-handling.ts';

/** Builds the Hono application serving the healthcheck, course catalog, and enrollment workflow. */
export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	const services = requestScopedServices(applicationServicesFactory);

	registerHealthRoutes(app, services);
	registerCourseRoutes(app, services);
	registerEnrollmentRequestRoutes(app, services);

	app.onError((error, c) => errorResponse(c, error));

	return app;
}

/** Adapts the Hono application to the Azure Functions HTTP handler contract. */
export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
