import { type ApplicationServicesFactory, COURSE_MODALITIES, COURSE_SORTS, COURSE_STATUSES, type CourseModality, type CourseSearchQuery, type CourseSort, type CourseStatus } from '@axc/application-services';
import type { HttpHandler, HttpRequest, InvocationContext } from '@azure/functions';
import { azureHonoHandler } from '@marplex/hono-azurefunc-adapter';
import { Hono } from 'hono';

const COURSE_QUERY_PARAMETERS = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'] as const;
const COURSE_QUERY_PARAMETER_SET = new Set<string>(COURSE_QUERY_PARAMETERS);

interface QueryValidationDetail {
	field: string;
	message: string;
}

interface QueryValidationResult {
	query?: CourseSearchQuery;
	details: QueryValidationDetail[];
}

function isOneOf<T extends string>(value: string, choices: readonly T[]): value is T {
	return choices.some((choice) => choice === value);
}

function parsePositiveInteger(value: string): number | undefined {
	if (!/^[1-9]\d*$/.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function validateCourseQuery(searchParams: URLSearchParams): QueryValidationResult {
	const details: QueryValidationDetail[] = [];
	const unknownParameters = new Set<string>();
	for (const field of searchParams.keys()) {
		if (!COURSE_QUERY_PARAMETER_SET.has(field)) {
			unknownParameters.add(field);
		}
	}
	for (const field of unknownParameters) {
		details.push({ field, message: `${field} is not a supported query parameter.` });
	}

	for (const field of COURSE_QUERY_PARAMETERS) {
		if (searchParams.getAll(field).length > 1) {
			details.push({ field, message: `${field} must be provided at most once.` });
		}
	}

	const qValue = searchParams.get('q');
	const modalityValue = searchParams.get('modality');
	const statusValue = searchParams.get('status');
	const tagValue = searchParams.get('tag');
	const pageValue = searchParams.get('page');
	const pageSizeValue = searchParams.get('pageSize');
	const sortValue = searchParams.get('sort');

	if (qValue !== null && qValue.trim().length === 0) {
		details.push({ field: 'q', message: 'q must not be empty.' });
	}
	if (modalityValue !== null && !isOneOf(modalityValue, COURSE_MODALITIES)) {
		details.push({ field: 'modality', message: `modality must be one of: ${COURSE_MODALITIES.join(', ')}.` });
	}
	if (statusValue !== null && !isOneOf(statusValue, COURSE_STATUSES)) {
		details.push({ field: 'status', message: `status must be one of: ${COURSE_STATUSES.join(', ')}.` });
	}
	if (tagValue !== null && tagValue.trim().length === 0) {
		details.push({ field: 'tag', message: 'tag must not be empty.' });
	}

	const page = pageValue === null ? 1 : parsePositiveInteger(pageValue);
	if (page === undefined) {
		details.push({ field: 'page', message: 'page must be a positive integer.' });
	}
	const pageSize = pageSizeValue === null ? 10 : parsePositiveInteger(pageSizeValue);
	if (pageSize === undefined || pageSize > 50) {
		details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
	}
	if (sortValue !== null && !isOneOf(sortValue, COURSE_SORTS)) {
		details.push({ field: 'sort', message: `sort must be one of: ${COURSE_SORTS.join(', ')}.` });
	}

	if (details.length > 0 || page === undefined || pageSize === undefined || pageSize > 50) {
		return { details };
	}

	return {
		details,
		query: {
			...(qValue === null ? {} : { q: qValue.trim() }),
			...(modalityValue === null ? {} : { modality: modalityValue as CourseModality }),
			...(statusValue === null ? {} : { status: statusValue as CourseStatus }),
			...(tagValue === null ? {} : { tag: tagValue.trim() }),
			page,
			pageSize,
			sort: (sortValue ?? 'title') as CourseSort,
		},
	};
}

export function createRestApp(applicationServicesFactory: ApplicationServicesFactory): Hono {
	const app = new Hono();

	app.get('/health', async (c) => {
		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(applicationServices.health.getStatus());
	});

	app.get('/api/courses', async (c) => {
		const validation = validateCourseQuery(new URL(c.req.url).searchParams);
		if (validation.query === undefined) {
			return c.json(
				{
					error: {
						code: 'INVALID_QUERY_PARAMETER',
						message: 'One or more query parameters are invalid.',
						details: validation.details,
					},
				},
				400,
			);
		}

		const authorization = c.req.header('Authorization');
		const applicationServices = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(await applicationServices.courses.search(validation.query));
	});

	return app;
}

export const restHandlerCreator = (applicationServicesFactory: ApplicationServicesFactory): HttpHandler => {
	const handler = azureHonoHandler(createRestApp(applicationServicesFactory).fetch);
	return (request: HttpRequest, context: InvocationContext) => handler(request, context);
};
