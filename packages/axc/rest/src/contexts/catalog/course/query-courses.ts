import type { ApplicationServicesFactory } from '@axc/application-services';
import type { Handler } from 'hono';
import { parseCourseQuery } from './parse-course-query.ts';

export const queryCourses =
	(factory: ApplicationServicesFactory): Handler =>
	async (context) => {
		const parsed = parseCourseQuery(new URL(context.req.url).searchParams);
		if (!parsed.success) {
			return context.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: parsed.details } }, 400);
		}
		const authorization = context.req.header('Authorization');
		const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
		return context.json(await services.Catalog.Course.queryCourses(parsed.criteria));
	};
