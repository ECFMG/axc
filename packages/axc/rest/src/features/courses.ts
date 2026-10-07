import type { ApplicationServicesFactory, CourseSearchQuery } from '@axc/application-services';
import type { Hono } from 'hono';

type Detail = { field: string; message: string };
const allowed = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

export const registerCourses = (app: Hono, applicationServicesFactory: ApplicationServicesFactory): void => {
	app.get('/api/courses', async (c) => {
		const params = new URL(c.req.url).searchParams;
		const details: Detail[] = [];
		for (const key of params.keys()) {
			if (!allowed.has(key)) details.push({ field: key, message: `Unknown query parameter: ${key}.` });
			else if (params.getAll(key).length > 1) details.push({ field: key, message: `${key} must occur once.` });
		}
		const value = (key: string) => params.get(key);
		const optionalText = (key: 'q' | 'tag') => {
			const raw = value(key);
			if (raw !== null && !raw.trim()) details.push({ field: key, message: `${key} must not be empty.` });
			return raw?.trim() || undefined;
		};
		const enumValue = <T extends string>(key: string, choices: readonly T[]): T | undefined => {
			const raw = value(key);
			if (raw !== null && !choices.includes(raw as T)) details.push({ field: key, message: `${key} must be one of: ${choices.join(', ')}.` });
			return raw && choices.includes(raw as T) ? (raw as T) : undefined;
		};
		const numberValue = (key: 'page' | 'pageSize', fallback: number, max?: number) => {
			const raw = value(key);
			if (raw === null) return fallback;
			const number = Number(raw);
			if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(number) || (max !== undefined && number > max)) {
				details.push({ field: key, message: max === undefined ? `${key} must be a positive integer.` : `${key} must be between 1 and ${max}.` });
			}
			return number;
		};
		const query: CourseSearchQuery = {
			page: numberValue('page', 1),
			pageSize: numberValue('pageSize', 10, 50),
			sort: enumValue('sort', ['title', 'createdAt', 'updatedAt']) ?? 'title',
		};
		const q = optionalText('q');
		const tag = optionalText('tag');
		const modality = enumValue('modality', ['online', 'in-person', 'hybrid']);
		const status = enumValue('status', ['draft', 'active', 'retired']);
		if (q !== undefined) query.q = q;
		if (tag !== undefined) query.tag = tag;
		if (modality !== undefined) query.modality = modality;
		if (status !== undefined) query.status = status;
		if (details.length) return c.json({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details } }, 400);
		const authorization = c.req.header('Authorization');
		const services = authorization === undefined ? await applicationServicesFactory.forRequest() : await applicationServicesFactory.forRequest(authorization);
		return c.json(await services.Catalog.Course.search(query));
	});
};
