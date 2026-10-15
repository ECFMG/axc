import type { ApplicationServicesFactory } from '@axc/application-services';
import { COURSE_MODALITIES, COURSE_SORT_FIELDS, COURSE_STATUSES, type CourseSearch } from '@axc/domain';
import type { Hono } from 'hono';

type Detail = { field: string; message: string };

export function parseCourseQuery(params: Record<string, string[]>): { query: CourseSearch; details: Detail[] } {
	const details: Detail[] = [];
	const allowed = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
	for (const [field, values] of Object.entries(params)) {
		if (!allowed.includes(field)) details.push({ field, message: 'Unknown query parameter.' });
		else if (values.length !== 1) details.push({ field, message: 'Query parameter must be supplied once.' });
	}
	const value = (field: string) => params[field]?.[0];
	function enumeration<T extends string>(field: string, choices: readonly T[], fallback: T): T {
		const raw = value(field);
		if (raw === undefined) return fallback;
		const match = choices.find((choice) => choice === raw);
		if (match !== undefined) return match;
		details.push({ field, message: `${field} must be one of: ${choices.join(', ')}.` });
		return fallback;
	}
	function integer(field: string, fallback: number, max: number): number {
		const raw = value(field);
		if (raw === undefined) return fallback;
		const number = Number(raw);
		if (!/^[0-9]+$/.test(raw) || !Number.isSafeInteger(number) || number < 1 || number > max) {
			details.push({ field, message: field === 'pageSize' ? 'pageSize must be between 1 and 50.' : 'page must be a positive safe integer.' });
			return fallback;
		}
		return number;
	}
	const query: CourseSearch = {
		page: integer('page', 1, Number.MAX_SAFE_INTEGER),
		pageSize: integer('pageSize', 10, 50),
		sort: enumeration('sort', COURSE_SORT_FIELDS, 'title'),
	};
	if (value('modality') !== undefined) query.modality = enumeration('modality', COURSE_MODALITIES, 'online');
	if (value('status') !== undefined) query.status = enumeration('status', COURSE_STATUSES, 'active');
	for (const field of ['q', 'tag'] as const) {
		const raw = value(field);
		if (raw !== undefined) {
			if (!raw.trim()) details.push({ field, message: `${field} must not be blank.` });
			else query[field] = raw.trim();
		}
	}
	return { query, details };
}

export function registerCourseRoutes(app: Hono, factory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const { query, details } = parseCourseQuery(c.req.queries());
		if (details.length) return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } }, 400);
		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
		return c.json(await services.courses.search(query));
	});
}
