import type { ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { Hono } from 'hono';
import { type Detail, invalid, queryFields } from './validation.ts';

const { modalities, courseStatuses, courseSorts } = Domain.Contexts.Catalog.Course;
export function registerCourses(app: Hono, factory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const details: Detail[] = [];
		const fields = queryFields(c, ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'], details);
		const enumValue = <T extends string>(field: 'modality' | 'status' | 'sort', allowed: readonly T[], fallback?: T): T | undefined => {
			const value = fields[field];
			if (value === undefined) return fallback;
			if (!allowed.includes(value as T)) {
				details.push({ field, message: `${field} must be one of ${allowed.join(', ')}.` });
				return fallback;
			}
			return value as T;
		};
		const integer = (field: 'page' | 'pageSize', fallback: number, max: number) => {
			const value = fields[field];
			if (value === undefined) return fallback;
			const number = Number(value);
			if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < 1 || number > max) {
				details.push({ field, message: `${field} must be between 1 and ${max}.` });
				return fallback;
			}
			return number;
		};
		const modality = enumValue('modality', modalities);
		const status = enumValue('status', courseStatuses);
		const sort = enumValue('sort', courseSorts, 'title') ?? 'title';
		const page = integer('page', 1, Number.MAX_SAFE_INTEGER);
		const pageSize = integer('pageSize', 10, 50);
		if (details.length) return invalid(c, details, true);
		const services = await factory.forRequest(c.req.header('Authorization'));
		return c.json(
			await services.Catalog.Course.queryCourses({
				page,
				pageSize,
				sort,
				...(fields.q !== undefined ? { q: fields.q } : {}),
				...(fields.tag !== undefined ? { tag: fields.tag } : {}),
				...(modality ? { modality } : {}),
				...(status ? { status } : {}),
			}),
		);
	});
}
