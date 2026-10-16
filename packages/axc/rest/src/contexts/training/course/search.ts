import type { TrainingApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import { Hono } from 'hono';
import { enumValue, HttpInputError, type InvalidField, optionalText } from '../../../validation.ts';

function positiveInteger(value: string | undefined, field: string, fallback: number, maximum: number, details: InvalidField[]): number | undefined {
	const text = optionalText(value);
	if (text === undefined) {
		return fallback;
	}
	if (!/^\d+$/.test(text)) {
		details.push({ field, message: `${field} must be a positive whole number${field === 'pageSize' ? ' between 1 and 50' : ''}.` });
		return undefined;
	}
	const parsed = Number(text);
	if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
		details.push({ field, message: field === 'pageSize' ? 'pageSize must be between 1 and 50.' : 'page must be a positive whole number within the supported integer range.' });
		return undefined;
	}
	return parsed;
}
export function createCourseRoutes(factory: TrainingApplicationServicesFactory): Hono {
	const app = new Hono();
	app.get('/', async (c) => {
		const query: { q?: string; modality?: string; status?: string; tag?: string; page?: string; pageSize?: string; sort?: string } = c.req.query();
		const details: InvalidField[] = [];
		const modality = enumValue(query.modality, Domain.Contexts.Training.Course.COURSE_MODALITIES, 'modality', details);
		const status = enumValue(query.status, Domain.Contexts.Training.Course.COURSE_STATUSES, 'status', details);
		const sort = enumValue(query.sort, Domain.Contexts.Training.Course.COURSE_SORT_FIELDS, 'sort', details) ?? 'title';
		const page = positiveInteger(query.page, 'page', 1, Number.MAX_SAFE_INTEGER, details);
		const pageSize = positiveInteger(query.pageSize, 'pageSize', 10, 50, details);
		if (page !== undefined && pageSize !== undefined && !Number.isSafeInteger((page - 1) * pageSize)) {
			details.push({ field: 'page', message: 'page must give a pagination offset within the supported integer range.' });
		}
		if (details.length > 0 || page === undefined || pageSize === undefined) {
			throw new HttpInputError('INVALID_QUERY_PARAMETER', details);
		}
		const q = optionalText(query.q);
		const tag = optionalText(query.tag);
		const services = await factory.forRequest(c.req.header('Authorization'));
		return c.json(
			await services.courses.search({ page, pageSize, sort, ...(modality === undefined ? {} : { modality }), ...(status === undefined ? {} : { status }), ...(q === undefined ? {} : { q }), ...(tag === undefined ? {} : { tag }) }),
		);
	});
	return app;
}
