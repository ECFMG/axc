import { type ApplicationServicesFactory, type CoursesQuery, courseModalities, courseSorts, courseStatuses, isCourseModality, isCourseSort, isCourseStatus } from '@axc/application-services';
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

const intParam = (raw: string | undefined, field: string, [min, max, fallback]: [number, number, number], message: string, details: Detail[]): number => {
	if (raw === undefined) return fallback;
	const n = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
	if (Number.isSafeInteger(n) && n >= min && n <= max) return n;
	details.push({ field, message });
	return fallback;
};

export function registerCoursesRoutes(app: Hono, factory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const details: Detail[] = [];
		const page = intParam(c.req.query('page'), 'page', [1, Number.MAX_SAFE_INTEGER, 1], 'page must be an integer greater than or equal to 1.', details);
		const pageSize = intParam(c.req.query('pageSize'), 'pageSize', [1, 50, 10], 'pageSize must be between 1 and 50.', details);
		const modality = c.req.query('modality');
		if (modality !== undefined && !isCourseModality(modality)) details.push({ field: 'modality', message: `modality must be one of ${courseModalities.join(', ')}.` });
		const status = c.req.query('status');
		if (status !== undefined && !isCourseStatus(status)) details.push({ field: 'status', message: `status must be one of ${courseStatuses.join(', ')}.` });
		const sortRaw = c.req.query('sort');
		if (sortRaw !== undefined && !isCourseSort(sortRaw)) details.push({ field: 'sort', message: `sort must be one of ${courseSorts.join(', ')}.` });
		if (details.length > 0) return c.json(errorBody(details), 400);
		const q = c.req.query('q');
		const tag = c.req.query('tag');
		const query: CoursesQuery = {
			page,
			pageSize,
			sort: sortRaw !== undefined && isCourseSort(sortRaw) ? sortRaw : 'title',
			...(q !== undefined ? { q } : {}),
			...(modality !== undefined && isCourseModality(modality) ? { modality } : {}),
			...(status !== undefined && isCourseStatus(status) ? { status } : {}),
			...(tag !== undefined ? { tag } : {}),
		};
		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
		return c.json(services.courses.list(query));
	});
}
