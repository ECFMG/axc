import { type ApplicationServicesFactory, type CourseModality, type CourseQuery, type CourseSort, type CourseStatus, courseModalities, courseSorts, courseStatuses } from '@axc/application-services';
import type { Hono } from 'hono';

interface Detail {
	field: string;
	message: string;
}

const isOneOf = <T extends string>(values: readonly T[], value: string): value is T => (values as readonly string[]).includes(value);

const intParam = (raw: string | undefined, field: string, min: number, max: number, fallback: number, details: Detail[]): number => {
	if (raw === undefined) {
		return fallback;
	}
	const parsed = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
	if (Number.isSafeInteger(parsed) && parsed >= min && parsed <= max) {
		return parsed;
	}
	const message = field === 'pageSize' ? 'pageSize must be between 1 and 50.' : 'page must be an integer greater than or equal to 1.';
	details.push({ field, message });
	return fallback;
};

const enumParam = <T extends string>(raw: string | undefined, field: string, allowed: readonly T[], details: Detail[]): T | undefined => {
	if (raw === undefined) {
		return undefined;
	}
	if (isOneOf(allowed, raw)) {
		return raw;
	}
	details.push({ field, message: `must be one of ${allowed.join(', ')}` });
	return undefined;
};

const textParam = (raw: string | undefined, field: string, details: Detail[]): string | undefined => {
	if (raw === undefined) {
		return undefined;
	}
	if (raw.length === 0) {
		details.push({ field, message: 'must be a non-empty string' });
		return undefined;
	}
	return raw;
};

export function registerCourseRoutes(app: Hono, factory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const details: Detail[] = [];
		const page = intParam(c.req.query('page'), 'page', 1, Number.MAX_SAFE_INTEGER, 1, details);
		const pageSize = intParam(c.req.query('pageSize'), 'pageSize', 1, 50, 10, details);
		const sort = enumParam<CourseSort>(c.req.query('sort'), 'sort', courseSorts, details) ?? 'title';
		const modality = enumParam<CourseModality>(c.req.query('modality'), 'modality', courseModalities, details);
		const status = enumParam<CourseStatus>(c.req.query('status'), 'status', courseStatuses, details);
		const q = textParam(c.req.query('q'), 'q', details);
		const tag = textParam(c.req.query('tag'), 'tag', details);
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

		const query: CourseQuery = { page, pageSize, sort };
		if (q !== undefined) {
			query.q = q;
		}
		if (modality !== undefined) {
			query.modality = modality;
		}
		if (status !== undefined) {
			query.status = status;
		}
		if (tag !== undefined) {
			query.tag = tag;
		}

		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
		return c.json(services.courses.list(query));
	});
}
