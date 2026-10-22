import type { ApplicationServicesFactory } from '@axc/application-services';
import { ApplicationFailure } from '@axc/application-services';
import type { Hono } from 'hono';
import { respondToError } from './errors.ts';
export const registerCourses = (app: Hono, factory: ApplicationServicesFactory) => {
	app.get('/api/courses', async (c) => {
		try {
			const params = new URL(c.req.url).searchParams;
			const allowed = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);
			const details = [...params.keys()].filter((key) => !allowed.has(key) || params.getAll(key).length > 1).map((field) => ({ field, message: 'Unknown or repeated parameter.' }));
			if (details.length) throw new ApplicationFailure('INVALID_QUERY_PARAMETER', 'One or more query parameters are invalid.', details);
			const rawPage = params.get('page');
			const rawSize = params.get('pageSize');
			const service = (await factory.forRequest()).Training.Course;
			return c.json(
				await service.search({
					...(params.has('q') ? { q: params.get('q') ?? '' } : {}),
					...(params.has('modality') ? { modality: params.get('modality') ?? '' } : {}),
					...(params.has('status') ? { status: params.get('status') ?? '' } : {}),
					...(params.has('tag') ? { tag: params.get('tag') ?? '' } : {}),
					...(rawPage !== null ? { page: /^\d+$/.test(rawPage) ? Number(rawPage) : NaN } : {}),
					...(rawSize !== null ? { pageSize: /^\d+$/.test(rawSize) ? Number(rawSize) : NaN } : {}),
					...(params.has('sort') ? { sort: params.get('sort') as 'title' | 'createdAt' | 'updatedAt' } : {}),
				}),
			);
		} catch (error) {
			return respondToError(c, error);
		}
	});
};
