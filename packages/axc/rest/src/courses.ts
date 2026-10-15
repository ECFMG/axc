import type { ApplicationServicesFactory } from '@axc/application-services';
import type { Hono } from 'hono';
import { parseCoursesQuery } from './courses-query.ts';

export function registerCoursesRoute(app: Hono, applicationServicesFactory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const parsed = parseCoursesQuery(c.req.query());
		if (!parsed.valid) {
			return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: parsed.details } }, 400);
		}
		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(await services.Catalog.Course.queryCourses(parsed.criteria));
	});
}
