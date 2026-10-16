import type { ApplicationServicesFactory } from '@axc/application-services';
import type { Handler } from 'hono';
import { parseCourseQuery } from './parse-query.ts';
export const listCourses =
	(factory: ApplicationServicesFactory): Handler =>
	async (context) => {
		const query = parseCourseQuery(context.req.queries());
		if (query.details !== undefined) {
			return context.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: query.details } }, 400);
		}
		const authorization = context.req.header('Authorization');
		const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
		return context.json(await services.Catalog.Course.queryCourses(query.criteria));
	};
