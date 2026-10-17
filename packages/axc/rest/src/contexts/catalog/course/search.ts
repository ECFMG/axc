import type { ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { Context, Handler } from 'hono';

const { COURSE_MODALITIES, COURSE_STATUSES, COURSE_SORT_FIELDS, COURSE_DEFAULT_PAGE_SIZE, COURSE_MAX_PAGE_SIZE } = Domain.Contexts.Catalog.Course;
export const courseSearchHandler =
	(factory: ApplicationServicesFactory): Handler =>
	async (c: Context) => {
		const details: { field: string; message: string }[] = [];
		const input = (field: string): string | undefined => {
			const value = c.req.query(field)?.trim();
			return value === '' ? undefined : value;
		};
		const enumInput = <T extends string>(field: string, allowed: readonly T[]): T | undefined => {
			const value = input(field);
			if (value === undefined) {
				return undefined;
			}
			const found = allowed.find((candidate) => candidate === value);
			if (found === undefined) {
				details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
			}
			return found;
		};
		const integerInput = (field: string, fallback: number, max: number): number => {
			const value = input(field);
			if (value === undefined) {
				return fallback;
			}
			if (!/^[0-9]+$/.test(value)) {
				details.push({ field, message: `${field} must be a whole number between 1 and ${max}.` });
				return fallback;
			}
			const parsed = Number(value);
			if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
				details.push({ field, message: `${field} must be between 1 and ${max}.` });
				return fallback;
			}
			return parsed;
		};
		const modality = enumInput('modality', COURSE_MODALITIES);
		const status = enumInput('status', COURSE_STATUSES);
		const sort = enumInput('sort', COURSE_SORT_FIELDS) ?? 'title';
		const page = integerInput('page', 1, Number.MAX_SAFE_INTEGER);
		const pageSize = integerInput('pageSize', COURSE_DEFAULT_PAGE_SIZE, COURSE_MAX_PAGE_SIZE);
		if (!Number.isSafeInteger((page - 1) * pageSize)) {
			details.push({ field: 'page', message: 'page is too large for this pageSize.' });
		}
		if (details.length > 0) {
			return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } }, 400);
		}
		const q = input('q');
		const tag = input('tag');
		const criteria: Domain.Contexts.Catalog.Course.CourseSearchCriteria = { page, pageSize, sort };
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
		try {
			const authorization = c.req.header('Authorization');
			const services = authorization === undefined ? await factory.forRequest() : await factory.forRequest(authorization);
			return c.json(await services.courses.search(criteria));
		} catch (error) {
			console.error('Course search failed', error);
			return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unable to search courses.' } }, 500);
		}
	};
