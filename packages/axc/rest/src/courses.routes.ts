import { type ApplicationServicesFactory, type CourseQuery, courseModalities, courseSorts, courseStatuses, isCourseModality, isCourseSort, isCourseStatus } from '@axc/application-services';
import type { Hono } from 'hono';

interface Detail {
	field: string;
	message: string;
}

const errorBody = (details: Detail[]) => ({
	error: {
		code: 'INVALID_QUERY_PARAMETER',
		message: 'One or more query parameters are invalid.',
		details,
	},
});

const intParam = (raw: string | undefined, field: string, min: number, max: number | undefined, fallback: number, details: Detail[]): number => {
	if (raw === undefined) return fallback;
	const parsed = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
	if (Number.isSafeInteger(parsed) && parsed >= min && (max === undefined || parsed <= max)) return parsed;
	const message = max === undefined ? `${field} must be an integer greater than or equal to ${min}.` : `${field} must be between ${min} and ${max}.`;
	details.push({ field, message });
	return fallback;
};

const enumParam = <T extends string>(raw: string | undefined, field: string, allowed: readonly T[], isAllowed: (value: unknown) => value is T, details: Detail[]): T | undefined => {
	if (raw === undefined) return undefined;
	if (isAllowed(raw)) return raw;
	details.push({ field, message: `${field} must be one of ${allowed.join(', ')}.` });
	return undefined;
};

export function registerCoursesRoutes(app: Hono, factory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const details: Detail[] = [];
		const q = c.req.query('q');
		if (q !== undefined && q.length === 0) details.push({ field: 'q', message: 'q must be a non-empty string.' });
		const modality = enumParam(c.req.query('modality'), 'modality', courseModalities, isCourseModality, details);
		const status = enumParam(c.req.query('status'), 'status', courseStatuses, isCourseStatus, details);
		const tag = c.req.query('tag');
		if (tag !== undefined && tag.length === 0) details.push({ field: 'tag', message: 'tag must be a non-empty string.' });
		const page = intParam(c.req.query('page'), 'page', 1, undefined, 1, details);
		const pageSize = intParam(c.req.query('pageSize'), 'pageSize', 1, 50, 10, details);
		const sort = enumParam(c.req.query('sort'), 'sort', courseSorts, isCourseSort, details);
		if (details.length > 0) return c.json(errorBody(details), 400);

		const parsedSort = sort ?? 'title';
		const query: CourseQuery = { page, pageSize, sort: parsedSort };
		if (q !== undefined) query.q = q;
		if (modality !== undefined) query.modality = modality;
		if (status !== undefined) query.status = status;
		if (tag !== undefined) query.tag = tag;

		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
		return c.json(services.courses.list(query));
	});
}
