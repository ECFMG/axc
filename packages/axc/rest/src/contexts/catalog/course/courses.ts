import type { ApplicationServicesFactory } from '@axc/application-services';
import { Hono } from 'hono';
import { parseCourseQuery } from './parse-course-query.ts';

export function coursesRoutes(factory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	app.get('/', async (c) => {
		const parsed = parseCourseQuery(c.req.query());
		if (!parsed.valid) {
			return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: parsed.details } }, 400);
		}
		try {
			const authorization = c.req.header('Authorization');
			const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
			const result = await services.Catalog.Course.queryCourses(parsed.criteria);
			return c.json(result);
		} catch {
			return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to search courses.' } }, 500);
		}
	});
	return app;
}
