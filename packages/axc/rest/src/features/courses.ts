import type { ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { Hono } from 'hono';
import { choice, integer, queryFields, text } from './validation.ts';

const { modalities, courseStatuses, courseSorts } = Domain.Contexts.Catalog;
export function registerCourses(app: Hono, factory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const details: Domain.Contexts.Catalog.Problem[] = [];
		queryFields(c.req.url, ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'], details);
		const q = text(c.req.query('q'), 'q', details);
		const modality = choice(c.req.query('modality'), 'modality', modalities, details);
		const status = choice(c.req.query('status'), 'status', courseStatuses, details);
		const tag = text(c.req.query('tag'), 'tag', details);
		const page = integer(c.req.query('page'), 'page', 1, Number.MAX_SAFE_INTEGER, details);
		const pageSize = integer(c.req.query('pageSize'), 'pageSize', 10, 50, details);
		const sort = choice(c.req.query('sort'), 'sort', courseSorts, details) ?? 'title';
		if (details.length) return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } }, 400);
		const services = await factory.forRequest(c.req.header('Authorization'));
		return c.json(
			await services.Catalog.Course.queryCourses({
				...(q === undefined ? {} : { q }),
				...(modality === undefined ? {} : { modality }),
				...(status === undefined ? {} : { status }),
				...(tag === undefined ? {} : { tag }),
				page,
				pageSize,
				sort,
			}),
		);
	});
}
