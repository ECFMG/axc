import type { ApplicationServicesFactory, CourseQueryCommand } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';
import { courseQuery } from './course-query.ts';

const MODALITIES = ['online', 'in-person', 'hybrid'] as const;
const STATUSES = ['draft', 'active', 'retired'] as const;
const SORTS = ['title', 'createdAt', 'updatedAt'] as const;
const QUERY_FIELDS = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const queries = c.req.queries();
		const details: { field: string; message: string }[] = [];
		for (const key of Object.keys(queries)) {
			if (!QUERY_FIELDS.has(key)) details.push({ field: key, message: `${key} is not a supported query parameter.` });
		}
		const read = (field: string): string | undefined => {
			const values = queries[field];
			if (values === undefined || values.length === 0) return undefined;
			const value = values[0];
			if (values.length !== 1 || value === undefined) {
				details.push({ field, message: `${field} must be provided once.` });
				return undefined;
			}
			return value;
		};
		const parsePage = (field: 'page' | 'pageSize', fallback: number, maximum: number): number => {
			const raw = read(field);
			if (raw === undefined) return fallback;
			if (!/^[1-9]\d*$/.test(raw)) {
				details.push({ field, message: field === 'page' ? 'page must be an integer greater than or equal to 1.' : 'pageSize must be between 1 and 50.' });
				return fallback;
			}
			const value = Number(raw);
			if (value > maximum) {
				details.push({ field, message: field === 'page' ? 'page must be an integer greater than or equal to 1.' : 'pageSize must be between 1 and 50.' });
				return fallback;
			}
			return value;
		};
		const modalityRaw = read('modality');
		const statusRaw = read('status');
		const sortRaw = read('sort');
		const q = read('q');
		const tag = read('tag');
		const page = parsePage('page', 1, Number.MAX_SAFE_INTEGER);
		const pageSize = parsePage('pageSize', 10, 50);
		const modality = MODALITIES.find((value) => value === modalityRaw);
		const status = STATUSES.find((value) => value === statusRaw);
		const sort = SORTS.find((value) => value === sortRaw) ?? 'title';
		if (modalityRaw !== undefined && modality === undefined) details.push({ field: 'modality', message: 'modality must be online, in-person, or hybrid.' });
		if (statusRaw !== undefined && status === undefined) details.push({ field: 'status', message: 'status must be draft, active, or retired.' });
		if (sortRaw !== undefined && !SORTS.some((value) => value === sortRaw)) details.push({ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' });
		if (details.length > 0) {
			return c.json(
				{
					error: {
						code: 'INVALID_QUERY_PARAMETER',
						message: 'One or more query parameters are invalid.',
						details,
					},
				},
				400,
			);
		}
		const command: CourseQueryCommand = {
			page,
			pageSize,
			sort,
			...(q === undefined || q.trim() === '' ? {} : { q: q.trim() }),
			...(modality === undefined ? {} : { modality }),
			...(status === undefined ? {} : { status }),
			...(tag === undefined || tag.trim() === '' ? {} : { tag: tag.trim() }),
		};
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(await courseQuery(applicationServices, command));
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
