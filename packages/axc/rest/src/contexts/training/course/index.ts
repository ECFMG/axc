import type { ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { Hono } from 'hono';
import { optionalText, parseEnum, RequestValidationError, requireValid } from '../../../validation.ts';
export const registerCourseRoutes = (app: Hono, factory: ApplicationServicesFactory): void => {
	app.get('/api/courses', async (c) => {
		const details: Domain.Contexts.Training.EnrollmentRequest.ValidationDetail[] = [];
		const positiveInteger = (field: string, fallback: number, maximum: number): number | undefined => {
			const raw = optionalText(c.req.query(field));
			if (raw === undefined) {
				return fallback;
			}
			if (!/^\d+$/.test(raw)) {
				details.push({ field, message: `${field} must be a whole number between 1 and ${maximum}.` });
				return undefined;
			}
			const number = Number(raw);
			if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
				details.push({ field, message: `${field} must be between 1 and ${maximum}.` });
				return undefined;
			}
			return number;
		};
		const modality = parseEnum(c.req.query('modality'), Domain.Contexts.Training.Course.COURSE_MODALITIES, 'modality', details);
		const status = parseEnum(c.req.query('status'), Domain.Contexts.Training.Course.COURSE_STATUSES, 'status', details);
		const sort = parseEnum(c.req.query('sort'), Domain.Contexts.Training.Course.COURSE_SORT_FIELDS, 'sort', details) ?? 'title';
		const page = positiveInteger('page', 1, Number.MAX_SAFE_INTEGER);
		const pageSize = positiveInteger('pageSize', 10, 50);
		if (page === undefined || pageSize === undefined) {
			throw new RequestValidationError(details, true);
		}
		if (!Number.isSafeInteger((page - 1) * pageSize)) {
			details.push({ field: 'page', message: 'page must allow a safe whole-number offset for pageSize.' });
		}
		requireValid(details, true);
		const criteria: Domain.Contexts.Training.Course.CourseSearch = { page, pageSize, sort };
		const q = optionalText(c.req.query('q'));
		const tag = optionalText(c.req.query('tag'));
		if (q !== undefined) {
			criteria.q = q;
		}
		if (tag !== undefined) {
			criteria.tag = tag;
		}
		if (modality !== undefined) {
			criteria.modality = modality;
		}
		if (status !== undefined) {
			criteria.status = status;
		}
		const services = await factory.forRequest(c.req.header('Authorization'));
		return c.json(await services.Training.Course.queryCourses(criteria));
	});
};
