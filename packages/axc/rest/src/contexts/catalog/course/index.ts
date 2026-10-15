import type { ApplicationServicesFactory } from '@axc/application-services';
import { Hono } from 'hono';
import { parseCourseQuery } from './parse-course-query.ts';

export function createCourseRoutes(factory: ApplicationServicesFactory): Hono {
	const routes = new Hono();
	routes.get('/api/courses', async (c) => {
		const parsed = parseCourseQuery(new URL(c.req.url).searchParams);
		if ('details' in parsed) {
			return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: parsed.details } }, 400);
		}
		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
		return c.json(await services.Catalog.Course.queryCourses(parsed.criteria));
	});
	return routes;
}
