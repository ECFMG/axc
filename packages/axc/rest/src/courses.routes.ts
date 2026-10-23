import {
	type ApplicationServicesFactory,
	type Course,
	type CourseModality,
	type CoursePage,
	type CourseQuery,
	type CourseSort,
	type CourseStatus,
	courseModalities,
	courseSorts,
	courseStatuses,
	isCourseModality,
	isCourseSort,
	isCourseStatus,
} from '@axc/application-services';
import type { Hono } from 'hono';

interface Detail {
	field: string;
	message: string;
}

const queryError = (details: Detail[]) => ({
	error: {
		code: 'INVALID_QUERY_PARAMETER',
		message: 'One or more query parameters are invalid.',
		details,
	},
});

const intParam = (raw: string | undefined, field: string, min: number, max: number, details: Detail[]): number | undefined => {
	if (raw === undefined) return undefined;
	const value = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
	if (Number.isSafeInteger(value) && value >= min && value <= max) return value;
	const message = field === 'pageSize' ? 'pageSize must be between 1 and 50.' : 'page must be an integer between 1 and 10000.';
	details.push({ field, message });
	return undefined;
};

export function registerCourseRoutes(app: Hono, factory: ApplicationServicesFactory): void {
	const servicesFor = (authorization: string | undefined) => (authorization === undefined ? factory.forRequest() : factory.forRequest(authorization));

	app.get('/api/courses', async (c) => {
		const details: Detail[] = [];
		const qRaw = c.req.query('q');
		const modalityRaw = c.req.query('modality');
		const statusRaw = c.req.query('status');
		const tagRaw = c.req.query('tag');
		const sortRaw = c.req.query('sort');
		if (qRaw !== undefined && qRaw.trim() === '') details.push({ field: 'q', message: 'q must be a non-empty string.' });
		if (modalityRaw !== undefined && !isCourseModality(modalityRaw)) details.push({ field: 'modality', message: `modality must be one of ${courseModalities.join(', ')}.` });
		if (statusRaw !== undefined && !isCourseStatus(statusRaw)) details.push({ field: 'status', message: `status must be one of ${courseStatuses.join(', ')}.` });
		if (tagRaw !== undefined && tagRaw.trim() === '') details.push({ field: 'tag', message: 'tag must be a non-empty string.' });
		const pageValue = intParam(c.req.query('page'), 'page', 1, 10000, details);
		const pageSizeValue = intParam(c.req.query('pageSize'), 'pageSize', 1, 50, details);
		if (sortRaw !== undefined && !isCourseSort(sortRaw)) details.push({ field: 'sort', message: `sort must be one of ${courseSorts.join(', ')}.` });
		if (details.length > 0) return c.json(queryError(details), 400);

		let modality: CourseModality | undefined;
		if (modalityRaw !== undefined && isCourseModality(modalityRaw)) modality = modalityRaw;
		let status: CourseStatus | undefined;
		if (statusRaw !== undefined && isCourseStatus(statusRaw)) status = statusRaw;
		let sort: CourseSort = 'title';
		if (sortRaw !== undefined && isCourseSort(sortRaw)) sort = sortRaw;
		const query: CourseQuery = { page: pageValue ?? 1, pageSize: pageSizeValue ?? 10, sort };
		if (qRaw !== undefined && qRaw.trim() !== '') query.q = qRaw.trim();
		if (modality !== undefined) query.modality = modality;
		if (status !== undefined) query.status = status;
		if (tagRaw !== undefined && tagRaw.trim() !== '') query.tag = tagRaw.trim();

		const services = await servicesFor(c.req.header('Authorization'));
		const body: CoursePage = services.courses.list(query);
		const items: Course[] = body.items;
		return c.json({ ...body, items });
	});
}
