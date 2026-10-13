import type { ApplicationServicesFactory, CourseSearchRequest } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';

const COURSE_QUERY_FIELDS = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'] as const;
type CourseQueryField = (typeof COURSE_QUERY_FIELDS)[number];

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
		const outcome = await applicationServices.courses.search(courseSearchRequest(c.req.queries()));
		if (!outcome.ok) {
			return c.json({ error: outcome.error }, 400);
		}
		return c.json(outcome.page);
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};

function courseSearchRequest(queries: Record<string, string[]>): CourseSearchRequest {
	const request: {
		q?: string;
		modality?: string;
		status?: string;
		tag?: string;
		page?: string;
		pageSize?: string;
		sort?: string;
		repeated?: string[];
		unknown?: string[];
	} = {};
	const repeated: string[] = [];
	const unknown: string[] = [];

	for (const [field, values] of Object.entries(queries)) {
		if (!isCourseQueryField(field)) {
			unknown.push(field);
			continue;
		}
		if (values.length > 1) {
			repeated.push(field);
			continue;
		}
		const value = values[0];
		if (value !== undefined) {
			assignCourseQuery(request, field, value);
		}
	}

	if (repeated.length > 0) {
		request.repeated = repeated;
	}
	if (unknown.length > 0) {
		request.unknown = unknown;
	}
	return request;
}

function assignCourseQuery(request: { q?: string; modality?: string; status?: string; tag?: string; page?: string; pageSize?: string; sort?: string }, field: CourseQueryField, value: string): void {
	if (field === 'q') {
		request.q = value;
	} else if (field === 'modality') {
		request.modality = value;
	} else if (field === 'status') {
		request.status = value;
	} else if (field === 'tag') {
		request.tag = value;
	} else if (field === 'page') {
		request.page = value;
	} else if (field === 'pageSize') {
		request.pageSize = value;
	} else {
		request.sort = value;
	}
}

function isCourseQueryField(field: string): field is CourseQueryField {
	return COURSE_QUERY_FIELDS.some((candidate) => candidate === field);
}
