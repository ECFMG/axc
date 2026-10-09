import type { ApplicationServicesFactory, CourseSearchQuery } from '@axc/application-services';
import type { Hono } from 'hono';
import { type Detail, invalid } from './errors.ts';

const modalities = ['online', 'in-person', 'hybrid'];
const statuses = ['draft', 'active', 'retired'];
const sorts = ['title', 'createdAt', 'updatedAt'];
export const registerCourseRoutes = (app: Hono, factory: ApplicationServicesFactory): void => {
	app.get('/api/courses', async (c) => {
		const params = new URL(c.req.url).searchParams;
		const details: Detail[] = [];
		const allowed = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
		for (const key of params.keys()) {
			if (!allowed.includes(key)) details.push({ field: key, message: `${key} is not supported.` });
			if (params.getAll(key).length > 1) details.push({ field: key, message: `${key} must appear once.` });
		}
		const modality = params.get('modality');
		const status = params.get('status');
		const sort = params.get('sort');
		if (modality !== null && !modalities.includes(modality)) details.push({ field: 'modality', message: 'modality is invalid.' });
		if (status !== null && !statuses.includes(status)) details.push({ field: 'status', message: 'status is invalid.' });
		if (sort !== null && !sorts.includes(sort)) details.push({ field: 'sort', message: 'sort is invalid.' });
		const parseNumber = (field: 'page' | 'pageSize', fallback: number, max: number) => {
			const value = params.get(field);
			if (value === null) return fallback;
			if (!/^[1-9]\d*$/.test(value) || Number(value) > max || !Number.isSafeInteger(Number(value))) {
				details.push({ field, message: `${field} must be between 1 and ${max}.` });
				return fallback;
			}
			return Number(value);
		};
		const page = parseNumber('page', 1, Number.MAX_SAFE_INTEGER);
		const pageSize = parseNumber('pageSize', 10, 50);
		if (details.length) return invalid(c, 'INVALID_QUERY_PARAMETER', details);
		const query: CourseSearchQuery = { page, pageSize, sort: (sort || 'title') as CourseSearchQuery['sort'] };
		const q = params.get('q');
		const tag = params.get('tag');
		if (q !== null) query.q = q;
		if (tag !== null) query.tag = tag;
		if (modality !== null) query.modality = modality as NonNullable<CourseSearchQuery['modality']>;
		if (status !== null) query.status = status as NonNullable<CourseSearchQuery['status']>;
		const services = await factory.forRequest();
		return c.json(await services.Catalog.Course.search(query));
	});
};
