import type { ApplicationServicesFactory } from '@axc/application-services';
import { Domain } from '@axc/domain';
import type { Hono } from 'hono';

const { modalities, statuses, sorts } = Domain.Contexts.Catalog.Course;
export function registerCourses(app: Hono, factory: ApplicationServicesFactory): void {
	app.get('/api/courses', async (c) => {
		const params = new URL(c.req.url).searchParams;
		const details: { field: string; message: string }[] = [];
		const allowed = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
		for (const field of new Set(params.keys())) {
			if (!allowed.includes(field)) details.push({ field, message: 'Unknown query parameter.' });
			if (params.getAll(field).length > 1) details.push({ field, message: 'Query parameter must appear only once.' });
		}
		const text = (field: string): string | undefined => {
			const value = params.get(field);
			if (value === null) return undefined;
			if (!value.trim()) details.push({ field, message: `${field} must not be empty.` });
			return value.trim();
		};
		const enumeration = <T extends string>(field: string, values: readonly T[], fallback?: T): T | undefined => {
			const value = params.get(field);
			if (value === null) return fallback;
			const match = values.find((candidate) => candidate === value);
			if (match === undefined) details.push({ field, message: `${field} must be one of: ${values.join(', ')}.` });
			return match;
		};
		const integer = (field: string, fallback: number, max = Number.MAX_SAFE_INTEGER): number => {
			const value = params.get(field);
			if (value === null) return fallback;
			const parsed = Number(value);
			if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
				details.push({ field, message: `${field} must be between 1 and ${max}.` });
			}
			return parsed;
		};
		const q = text('q');
		const tag = text('tag');
		const modality = enumeration('modality', modalities);
		const status = enumeration('status', statuses);
		const sort = enumeration('sort', sorts, 'title') ?? 'title';
		const page = integer('page', 1);
		const pageSize = integer('pageSize', 10, 50);
		if (details.length) return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } }, 400);
		const services = await factory.forRequest();
		return c.json(
			await services.Catalog.Course.queryCourses({
				page,
				pageSize,
				sort,
				...(q === undefined ? {} : { q }),
				...(tag === undefined ? {} : { tag }),
				...(modality === undefined ? {} : { modality }),
				...(status === undefined ? {} : { status }),
			}),
		);
	});
}
