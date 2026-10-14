import type { ApplicationServicesFactory } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';
import { z } from 'zod';

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const queryParams = c.req.query();

		const courseQuerySchema = z
			.object({
				q: z.string().optional(),
				modality: z.enum(['online', 'in-person', 'hybrid']).optional(),
				status: z.enum(['draft', 'active', 'retired']).optional(),
				tag: z.string().optional(),
				page: z
					.string()
					.transform((v) => parseInt(v, 10))
					.optional(),
				size: z
					.string()
					.transform((v) => parseInt(v, 10))
					.optional(),
				sort: z.enum(['title', 'createdAt', 'updatedAt']).optional(),
			})
			.refine(
				(data) => {
					if (data.page !== undefined && isNaN(data.page)) return false;
					if (data.size !== undefined && isNaN(data.size)) return false;
					return true;
				},
				{
					eschema: 'INVALID_QUERY_PARAMETER',
					message: 'One or more query parameters are invalid.',
				},
			);

		// Manual validation to match the specific error envelope requirement
		const errors: Array<{ field: string; message: string }> = [];

		if (queryParams.modality && !['online', 'in-person', 'hybrid'].includes(queryParams.modality)) {
			errors.push({ field: 'modality', message: 'Invalid modality.' });
		}
		if (queryParams.status && !['draft', 'active', 'retired'].includes(queryParams.status)) {
			errors.push({ field: 'status', message: 'Invalid status.' });
		}
		if (queryParams.sort && !['title', 'createdAt', 'updatedAt'].includes(queryParams.sort)) {
			errors.push({ field: 'sort', message: 'Invalid sort field.' });
		}

		const page = queryParams.page ? parseInt(queryParams.page, 10) : undefined;
		if (page !== undefined && isNaN(page)) {
			errors.push({ field: 'page', message: 'page must be a number.' });
		}

		const pageSize = queryParams.pageSize ? parseInt(queryParams.pageSize, 10) : undefined;
		if (pageSize !== undefined) {
			if (isNaN(pageSize)) {
				errors.push({ field: 'pageSize', message: 'pageSize must be a number.' });
			} else if (pageSize < 1 || pageSize > 50) {
				errors.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
			}
		}

		if (errors.length > 0) {
			return c.json(
				{
					error: {
						code: 'INVALID_QUERY_PARAMETER',
						message: 'One or more query parameters are invalid.',
						details: errors,
					},
				},
				{ status: 400 },
			);
		}

		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);

		const result = await applicationServices.courses.search({
			q: queryParams.q,
			modality: queryParams.modality as any,
			status: queryParams.status as any,
			tag: queryParams.tag,
			page: page ?? 1,
			pageSize: pageSize ?? 10,
			sort: (queryParams.sort as any) ?? 'title',
		});

		return c.json({
			items: result.items,
			page: result.page,
			size: result.size,
			totalItems: result.totalItems,
			totalPages: result.totalPages,
		});
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
