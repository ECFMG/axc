import type { ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { Hono } from 'hono';
export function registerCourses(app: Hono, factory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		try {
			const input = Object.fromEntries(Object.entries(c.req.queries()).map(([field, values]) => [field, values.length === 1 ? values[0] : values]));
			const query = Domain.Contexts.Catalog.Course.parseSearchQuery(input);
			const services = await factory.forRequest(c.req.header('Authorization'));
			return c.json(await services.Catalog.Course.queryCourses({ ...query }));
		} catch (error) {
			if (error instanceof Domain.Contexts.Catalog.Course.InvalidCourseQuery) return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: error.message, details: error.details } }, 400);
			throw error;
		}
	});
}
