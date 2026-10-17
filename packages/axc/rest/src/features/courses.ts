import type { ApplicationServicesFactory, CourseSearchQuery } from '@axc/application-services';
import type { Hono } from 'hono';
import { errorResponse } from './errors.ts';
export function registerCourses(app: Hono, factory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		try {
			const raw = c.req.query();
			const allowed = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
			const unknown = Object.keys(raw).find((key) => !allowed.includes(key));
			if (unknown) return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: unknown, message: 'Unknown query parameter.' }] } }, 400);
			const query: CourseSearchQuery = { ...raw, ...(raw['page'] !== undefined ? { page: Number(raw['page']) } : {}), ...(raw['pageSize'] !== undefined ? { pageSize: Number(raw['pageSize']) } : {}) };
			const services = await factory.forRequest();
			return c.json(await services.Catalog.Course.list(query));
		} catch (error) {
			return errorResponse(c, error);
		}
	});
}
