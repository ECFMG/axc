import type { ApplicationServicesFactory } from '@axc/application-services';
import { Hono } from 'hono';
import { parseCourseQuery } from './course-query.ts';

export function courseRoutes(factory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	app.get('/api/courses', async (c) => {
		const result = parseCourseQuery(new URL(c.req.url).searchParams);
		if (!result.ok) {
			return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: result.details } }, 400);
		}
		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
		return c.json(await services.Catalog.Course.queryCourses(result.query));
	});
	return app;
}
