import type { ApplicationServicesFactory } from '@axc/application-services';
import { Hono } from 'hono';
import { parseCourseQuery } from './course-query.ts';

export function createCoursesRoutes(factory: ApplicationServicesFactory): Hono {
	const app = new Hono();
	app.get('/api/courses', async (c) => {
		const parsed = parseCourseQuery(new URL(c.req.url).searchParams);
		if (parsed.details) {
			return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: parsed.details } }, 400);
		}
		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
		return c.json(await services.courses.search(parsed.input));
	});
	return app;
}
