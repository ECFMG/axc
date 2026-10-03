import type { ApplicationServicesFactory, CourseListQuery } from '@axc/application-services';
import type { Hono } from 'hono';

type Detail = { field: string; message: string };
const fields = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);
const modalities = new Set(['online', 'in-person', 'hybrid']);
const statuses = new Set(['draft', 'active', 'retired']);
const sorts = new Set(['title', 'createdAt', 'updatedAt']);

function parseQuery(params: URLSearchParams): { query?: CourseListQuery; details: Detail[] } {
	const details: Detail[] = [];
	for (const key of params.keys()) {
		if (!fields.has(key)) details.push({ field: key, message: `${key} is not a supported query parameter.` });
		else if (params.getAll(key).length > 1) details.push({ field: key, message: `${key} must be provided once.` });
	}
	const value = (key: string) => params.get(key) ?? undefined;
	const q = value('q')?.trim();
	const tag = value('tag')?.trim();
	if (value('q') !== undefined && !q) details.push({ field: 'q', message: 'q must not be empty.' });
	if (value('tag') !== undefined && !tag) details.push({ field: 'tag', message: 'tag must not be empty.' });
	const modality = value('modality');
	const status = value('status');
	const sort = value('sort') ?? 'title';
	if (modality !== undefined && !modalities.has(modality)) details.push({ field: 'modality', message: 'modality must be online, in-person, or hybrid.' });
	if (status !== undefined && !statuses.has(status)) details.push({ field: 'status', message: 'status must be draft, active, or retired.' });
	if (!sorts.has(sort)) details.push({ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' });
	const positiveInteger = (field: 'page' | 'pageSize', fallback: number, max?: number): number => {
		const raw = value(field);
		if (raw === undefined) return fallback;
		const parsed = Number(raw);
		if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(parsed) || (max !== undefined && parsed > max)) {
			details.push({ field, message: max === undefined ? `${field} must be a positive integer.` : `${field} must be between 1 and ${max}.` });
		}
		return parsed;
	};
	const page = positiveInteger('page', 1);
	const pageSize = positiveInteger('pageSize', 10, 50);
	if (details.length > 0) return { details };
	return {
		details,
		query: {
			...(q === undefined ? {} : { q }),
			...(tag === undefined ? {} : { tag }),
			...(modality === undefined ? {} : { modality: modality as NonNullable<CourseListQuery['modality']> }),
			...(status === undefined ? {} : { status: status as NonNullable<CourseListQuery['status']> }),
			page,
			pageSize,
			sort: sort as CourseListQuery['sort'],
		},
	};
}

export function registerCoursesRoutes(app: Hono, applicationServicesFactory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const { query, details } = parseQuery(new URL(c.req.url).searchParams);
		if (!query) return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } }, 400);
		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(await services.catalog.Course.list(query));
	});
}
