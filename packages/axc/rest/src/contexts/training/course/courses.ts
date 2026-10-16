import type { ApplicationServicesFactory } from '@axc/application-services';
import type { Hono } from 'hono';
import { requestServices } from '../../request-services.ts';
import { parseCourseQuery } from './parse-query.ts';
export function registerCourses(app: Hono, factory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (context) => {
		const criteria = parseCourseQuery(context.req.query());
		const services = await requestServices(context, factory);
		return context.json(await services.Training.Course.queryCourses(criteria));
	});
}
