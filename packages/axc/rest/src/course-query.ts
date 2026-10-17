import type { CourseQuery } from '@axc/application-services';

type Detail = { field: string; message: string };
const choices = {
	modality: ['online', 'in-person', 'hybrid'],
	status: ['draft', 'active', 'retired'],
	sort: ['title', 'createdAt', 'updatedAt'],
};
const fields = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];

export function parseCourseQuery(params: URLSearchParams): { query: CourseQuery; details: Detail[] } {
	const details: Detail[] = [];
	for (const field of new Set(params.keys())) {
		if (!fields.includes(field)) details.push({ field, message: 'Unknown query parameter.' });
		if (params.getAll(field).length > 1) details.push({ field, message: 'Query parameter must appear only once.' });
	}
	for (const [field, allowed] of Object.entries(choices)) {
		const value = params.get(field);
		if (value !== null && !allowed.includes(value)) details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	}
	const integer = (field: string, fallback: number, max: number): number => {
		const raw = params.get(field);
		if (raw === null) return fallback;
		const value = Number(raw);
		if (!/^[0-9]+$/.test(raw) || !Number.isSafeInteger(value) || value < 1 || value > max) {
			details.push({ field, message: `${field} must be between 1 and ${max}.` });
		}
		return value;
	};
	const query: CourseQuery = {
		page: integer('page', 1, Number.MAX_SAFE_INTEGER),
		pageSize: integer('pageSize', 10, 50),
		sort: (params.get('sort') ?? 'title') as CourseQuery['sort'],
	};
	const q = params.get('q');
	const tag = params.get('tag');
	const modality = params.get('modality');
	const status = params.get('status');
	if (q !== null) query.q = q;
	if (tag !== null) query.tag = tag;
	if (modality !== null) query.modality = modality as NonNullable<CourseQuery['modality']>;
	if (status !== null) query.status = status as NonNullable<CourseQuery['status']>;
	return { query, details };
}
