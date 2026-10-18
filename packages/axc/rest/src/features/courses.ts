import type { ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { Context } from 'hono';

const { validateCourseSearchQuery } = Domain.Contexts.Catalog.Course;
type Query = Domain.Contexts.Catalog.Course.CourseSearchQuery;
export const coursesHandler =
	(factory: ApplicationServicesFactory) =>
	async (c: Context): Promise<Response> => {
		const raw = c.req.queries();
		const { q, modality, status, tag, sort } = raw;
		const details: Domain.Contexts.Catalog.Course.QueryProblem[] = [];
		const allowed = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
		for (const [field, values] of Object.entries(raw)) {
			if (!allowed.includes(field)) details.push({ field, message: 'Unknown query parameter.' });
			else if (values.length !== 1) details.push({ field, message: 'Query parameter must appear once.' });
		}
		const integer = (field: string, fallback: number) => {
			const value = raw[field]?.[0];
			return value === undefined ? fallback : /^\d+$/.test(value) ? Number(value) : Number.NaN;
		};
		const query: Query = {
			...(q ? { q: q[0] ?? '' } : {}),
			...(modality ? { modality: modality[0] as NonNullable<Query['modality']> } : {}),
			...(status ? { status: status[0] as NonNullable<Query['status']> } : {}),
			...(tag ? { tag: tag[0] ?? '' } : {}),
			page: integer('page', 1),
			pageSize: integer('pageSize', 10),
			sort: (sort?.[0] ?? 'title') as Query['sort'],
		};
		details.push(...validateCourseSearchQuery(query));
		if (details.length) return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } }, 400);
		const authorization = c.req.header('Authorization');
		const services = await factory.forRequest(authorization);
		return c.json(await services.Catalog.Course.queryCourses(query));
	};
