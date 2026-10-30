import type { ApplicationServicesFactory } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';

const modalities = new Set(['online', 'in-person', 'hybrid']);
const statuses = new Set(['draft', 'active', 'retired']);
const sorts = new Set(['title', 'createdAt', 'updatedAt']);

const readBoundedInteger = (raw: string | undefined, min: number, max: number): number | undefined => {
	if (raw === undefined) {
		return undefined;
	}
	if (!/^[1-9]\d*$/.test(raw)) {
		return undefined;
	}
	const value = Number(raw);
	if (!Number.isInteger(value) || value < min || value > max) {
		return undefined;
	}
	return value;
};

const compareCourses = (left: { title: string; createdAt: Date; updatedAt: Date }, right: { title: string; createdAt: Date; updatedAt: Date }, sort: string): number => {
	if (sort === 'createdAt') {
		return left.createdAt.getTime() - right.createdAt.getTime();
	}
	if (sort === 'updatedAt') {
		return left.updatedAt.getTime() - right.updatedAt.getTime();
	}
	return left.title.localeCompare(right.title);
};

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const details: { field: string; message: string }[] = [];
		const modality = c.req.query('modality');
		const status = c.req.query('status');
		const sort = c.req.query('sort') ?? 'title';
		const page = readBoundedInteger(c.req.query('page'), 1, Number.POSITIVE_INFINITY);
		const pageSize = readBoundedInteger(c.req.query('pageSize'), 1, 50);
		if (modality !== undefined && !modalities.has(modality)) {
			details.push({ field: 'modality', message: 'modality must be online, in-person, or hybrid.' });
		}
		if (status !== undefined && !statuses.has(status)) {
			details.push({ field: 'status', message: 'status must be draft, active, or retired.' });
		}
		if (!sorts.has(sort)) {
			details.push({ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' });
		}
		if (c.req.query('page') !== undefined && page === undefined) {
			details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		}
		if (c.req.query('pageSize') !== undefined && pageSize === undefined) {
			details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		}
		if (details.length > 0) {
			return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } }, 400);
		}
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		const q = c.req.query('q');
		const tag = c.req.query('tag');
		const matches = await applicationServices.Catalog.Course.search({
			...(q !== undefined ? { q } : {}),
			...(modality !== undefined ? { modality } : {}),
			...(status !== undefined ? { status } : {}),
			...(tag !== undefined ? { tag } : {}),
		});
		const resolvedPage = page ?? 1;
		const resolvedPageSize = pageSize ?? 10;
		const sorted = [...matches].sort((left, right) => compareCourses(left, right, sort));
		const start = (resolvedPage - 1) * resolvedPageSize;
		const items = sorted.slice(start, start + resolvedPageSize).map((course) => ({
			id: course.id,
			title: course.title,
			summary: course.summary,
			modality: course.modality,
			status: course.status,
			tags: course.tags,
			createdAt: course.createdAt.toISOString(),
			updatedAt: course.updatedAt.toISOString(),
		}));
		return c.json({
			items,
			page: resolvedPage,
			pageSize: resolvedPageSize,
			totalItems: matches.length,
			totalPages: matches.length === 0 ? 0 : Math.ceil(matches.length / resolvedPageSize),
		});
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
