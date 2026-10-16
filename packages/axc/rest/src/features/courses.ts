import type { ApplicationServicesFactory } from '@axc/application-services';
import type { Hono } from 'hono';
import { errorResponse } from './errors.ts';
export const registerCourseRoutes = (app: Hono, factory: ApplicationServicesFactory): void => {
	app.get('/api/courses', async (c) => {
		try {
			const services = await factory.forRequest(c.req.header('Authorization'));
			return c.json(await services.Training.Course.search(c.req.query()));
		} catch (error) {
			return errorResponse(c, error);
		}
	});
};
