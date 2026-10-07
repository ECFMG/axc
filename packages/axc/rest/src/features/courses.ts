import type { ApplicationServicesFactory } from '@axc/application-services';
import type { Hono } from 'hono';

const allowed = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

export function registerCourses(app: Hono, applicationServicesFactory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const params = new URL(c.req.url).searchParams;
		const details: { field: string; message: string }[] = [];
		for (const key of params.keys()) {
			if (!allowed.has(key)) details.push({ field: key, message: `${key} is not supported.` });
			else if (params.getAll(key).length > 1) details.push({ field: key, message: `${key} must be specified once.` });
		}
		const q = params.get('q')?.trim();
		const tag = params.get('tag')?.trim();
		const modality = params.get('modality');
		const status = params.get('status');
		const sort = params.get('sort') ?? 'title';
		const pageText = params.get('page') ?? '1';
		const pageSizeText = params.get('pageSize') ?? '10';
		const page = Number(pageText);
		const pageSize = Number(pageSizeText);
		if (params.has('q') && !q) details.push({ field: 'q', message: 'q must not be empty.' });
		if (params.has('tag') && !tag) details.push({ field: 'tag', message: 'tag must not be empty.' });
		if (modality !== null && !['online', 'in-person', 'hybrid'].includes(modality)) details.push({ field: 'modality', message: 'modality must be online, in-person, or hybrid.' });
		if (status !== null && !['draft', 'active', 'retired'].includes(status)) details.push({ field: 'status', message: 'status must be draft, active, or retired.' });
		if (!['title', 'createdAt', 'updatedAt'].includes(sort)) details.push({ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' });
		if (!/^\d+$/.test(pageText) || !Number.isSafeInteger(page) || page < 1) details.push({ field: 'page', message: 'page must be a positive integer.' });
		if (!/^\d+$/.test(pageSizeText) || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50) details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		if (details.length) return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } }, 400);
		const services = await applicationServicesFactory.forRequest();
		const result = await services.Catalog.Course.search({
			...(q ? { q } : {}),
			...(tag ? { tag } : {}),
			...(modality ? { modality: modality as 'online' | 'in-person' | 'hybrid' } : {}),
			...(status ? { status: status as 'draft' | 'active' | 'retired' } : {}),
			page,
			pageSize,
			sort: sort as 'title' | 'createdAt' | 'updatedAt',
		});
		return c.json(result);
	});
}
