import type { ApplicationServicesFactory, CourseSearchInput } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		const outcome = applicationServices.courses.search(readCourseSearchInput((name) => c.req.query(name)));
		if (!outcome.ok) {
			return c.json(outcome.error, 400);
		}
		return c.json(outcome.page);
	});

	return app;
}

const courseSearchFields = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'] as const;

function readCourseSearchInput(read: (name: string) => string | undefined): CourseSearchInput {
	const input: CourseSearchInput = {};
	for (const name of courseSearchFields) {
		const value = read(name);
		if (value !== undefined) {
			input[name] = value;
		}
	}
	return input;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
