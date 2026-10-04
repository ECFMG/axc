import type { ApplicationServices, ApplicationServicesFactory, QueryParameterError } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';

export const INVALID_QUERY_PARAMETER_CODE = 'INVALID_QUERY_PARAMETER' as const;
export const INVALID_QUERY_PARAMETER_MESSAGE = 'One or more query parameters are invalid.' as const;

export interface ErrorResponse {
	error: {
		code: typeof INVALID_QUERY_PARAMETER_CODE;
		message: string;
		details: QueryParameterError[];
	};
}

const invalidQueryResponse = (details: QueryParameterError[]): ErrorResponse => ({
	error: {
		code: INVALID_QUERY_PARAMETER_CODE,
		message: INVALID_QUERY_PARAMETER_MESSAGE,
		details,
	},
});

const servicesForRequest = (applicationServicesFactory: ApplicationServicesFactory, authorization: string | undefined): Promise<ApplicationServices> =>
	authorization === undefined ? applicationServicesFactory.forRequest() : applicationServicesFactory.forRequest(authorization);

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const applicationServices = await servicesForRequest(applicationServicesFactory, c.req.header('Authorization'));
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const applicationServices = await servicesForRequest(applicationServicesFactory, c.req.header('Authorization'));
		const outcome = await applicationServices.courses.search(c.req.queries());
		return outcome.ok ? c.json(outcome.result, 200) : c.json(invalidQueryResponse(outcome.errors), 400);
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
