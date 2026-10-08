import type { ApplicationServicesFactory } from '@axc/application-services';
import type { CourseSearchQuery } from '@axc/persistence';
import type { Hono } from 'hono';

const modalities = ['online', 'in-person', 'hybrid'];
const statuses = ['draft', 'active', 'retired'];
const sorts = ['title', 'createdAt', 'updatedAt'];

export function registerCourseRoutes(app: Hono, services: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const params = new URL(c.req.url).searchParams;
		const details: { field: string; message: string }[] = [];
		for (const key of params.keys()) if (!['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'].includes(key)) details.push({ field: key, message: `${key} is not supported.` });
		for (const key of ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']) if (params.getAll(key).length > 1) details.push({ field: key, message: `${key} must appear once.` });
		const modality = params.get('modality');
		const status = params.get('status');
		const sort = params.get('sort') ?? 'title';
		const page = params.get('page') ?? '1';
		const pageSize = params.get('pageSize') ?? '10';
		if (modality !== null && !modalities.includes(modality)) details.push({ field: 'modality', message: 'modality is invalid.' });
		if (status !== null && !statuses.includes(status)) details.push({ field: 'status', message: 'status is invalid.' });
		if (!sorts.includes(sort)) details.push({ field: 'sort', message: 'sort is invalid.' });
		if (!/^[1-9]\d*$/.test(page) || !Number.isSafeInteger(Number(page))) details.push({ field: 'page', message: 'page must be a positive integer.' });
		if (!/^[1-9]\d*$/.test(pageSize) || Number(pageSize) > 50) details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		if (details.length) return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } }, 400);
		const query: CourseSearchQuery = { page: Number(page), pageSize: Number(pageSize), sort: sort as CourseSearchQuery['sort'] };
		if (params.has('q')) query.q = params.get('q') ?? '';
		if (params.has('tag')) query.tag = params.get('tag') ?? '';
		if (modality) query.modality = modality as NonNullable<CourseSearchQuery['modality']>;
		if (status) query.status = status as NonNullable<CourseSearchQuery['status']>;
		const application = await services.forRequest();
		return c.json(await application.Catalog.Course.search(query));
	});
}
