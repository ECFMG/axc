import type { ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { Context } from 'hono';

const { COURSE_MODALITIES, COURSE_STATUSES, COURSE_SORT_FIELDS, COURSE_DEFAULT_PAGE, COURSE_DEFAULT_PAGE_SIZE, COURSE_MAX_PAGE_SIZE } = Domain.Contexts.Catalog.Course;
interface QueryIssue {
	field: string;
	message: string;
}

function optionalText(raw: string | undefined): string | undefined {
	const trimmed = raw?.trim();
	return trimmed === '' ? undefined : trimmed;
}

function enumValue<T extends string>(raw: string | undefined, field: string, allowed: readonly T[], issues: QueryIssue[]): T | undefined {
	if (raw === undefined) {
		return undefined;
	}
	const value = allowed.find((candidate) => candidate === raw);
	if (value === undefined) {
		issues.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	}
	return value;
}

function positiveInteger(raw: string | undefined, field: string, defaultValue: number, maximum: number, issues: QueryIssue[]): number | undefined {
	if (raw === undefined) {
		return defaultValue;
	}
	if (/^[0-9]+$/.test(raw)) {
		const value = Number(raw);
		if (Number.isSafeInteger(value) && value >= 1 && value <= maximum) {
			return value;
		}
	}
	issues.push({ field, message: field === 'pageSize' ? `pageSize must be between 1 and ${COURSE_MAX_PAGE_SIZE}.` : 'page must be a positive whole number within the supported integer range.' });
	return undefined;
}

export const searchCoursesHandler =
	(factory: ApplicationServicesFactory) =>
	async (c: Context): Promise<Response> => {
		const issues: QueryIssue[] = [];
		const query = { modality: c.req.query('modality'), status: c.req.query('status'), sort: c.req.query('sort'), page: c.req.query('page'), pageSize: c.req.query('pageSize'), q: c.req.query('q'), tag: c.req.query('tag') };
		const modality = enumValue(optionalText(query.modality), 'modality', COURSE_MODALITIES, issues);
		const status = enumValue(optionalText(query.status), 'status', COURSE_STATUSES, issues);
		const sort = enumValue(optionalText(query.sort), 'sort', COURSE_SORT_FIELDS, issues);
		const page = positiveInteger(optionalText(query.page), 'page', COURSE_DEFAULT_PAGE, Number.MAX_SAFE_INTEGER, issues);
		const pageSize = positiveInteger(optionalText(query.pageSize), 'pageSize', COURSE_DEFAULT_PAGE_SIZE, COURSE_MAX_PAGE_SIZE, issues);
		if (issues.length > 0 || page === undefined || pageSize === undefined) {
			return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: issues } }, 400);
		}
		const q = optionalText(query.q);
		const tag = optionalText(query.tag);
		const criteria: Domain.Contexts.Catalog.Course.CourseSearchCriteria = {
			page,
			pageSize,
			sort: sort ?? 'title',
			...(q === undefined ? {} : { q }),
			...(tag === undefined ? {} : { tag }),
			...(modality === undefined ? {} : { modality }),
			...(status === undefined ? {} : { status }),
		};
		try {
			const authorization = c.req.header('Authorization');
			const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
			return c.json(await services.courses.search(criteria));
		} catch (error) {
			console.error('Course catalog search failed', error);
			return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to retrieve courses.' } }, 500);
		}
	};
