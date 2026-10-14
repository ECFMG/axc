import type { CourseModality, CourseQuery, CourseSort, CourseStatus } from '@axc/application-services';

interface QueryError {
	field: string;
	message: string;
}
type ParseResult = { query: CourseQuery; errors?: never } | { errors: QueryError[]; query?: never };
const allowed = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

export function parseCourseQuery(params: URLSearchParams): ParseResult {
	const errors: QueryError[] = [];
	for (const field of new Set(params.keys())) {
		if (!allowed.has(field)) errors.push({ field, message: 'Unknown query parameter.' });
		else if (params.getAll(field).length !== 1) errors.push({ field, message: 'Query parameter must occur once.' });
	}
	const modality = params.get('modality');
	const status = params.get('status');
	const sort = params.get('sort') ?? 'title';
	if (modality !== null && !['online', 'in-person', 'hybrid'].includes(modality)) errors.push({ field: 'modality', message: 'modality must be online, in-person, or hybrid.' });
	if (status !== null && !['draft', 'active', 'retired'].includes(status)) errors.push({ field: 'status', message: 'status must be draft, active, or retired.' });
	if (!['title', 'createdAt', 'updatedAt'].includes(sort)) errors.push({ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' });
	const integer = (field: string, fallback: number, max: number): number => {
		const raw = params.get(field);
		if (raw === null) return fallback;
		const value = Number(raw);
		if (!/^[0-9]+$/.test(raw) || !Number.isSafeInteger(value) || value < 1 || value > max) errors.push({ field, message: `${field} must be between 1 and ${max}.` });
		return value;
	};
	// Bound page so page offsets remain safe integers even at the maximum page size.
	const page = integer('page', 1, Math.floor(Number.MAX_SAFE_INTEGER / 50));
	const pageSize = integer('pageSize', 10, 50);
	if (errors.length) return { errors };
	return {
		query: {
			...(params.has('q') ? { q: params.get('q') ?? '' } : {}),
			...(params.has('tag') ? { tag: params.get('tag') ?? '' } : {}),
			...(modality === null ? {} : { modality: modality as CourseModality }),
			...(status === null ? {} : { status: status as CourseStatus }),
			page,
			pageSize,
			sort: sort as CourseSort,
		},
	};
}
