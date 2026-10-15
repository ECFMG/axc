import { Domain } from '@axc/domain';

const Values = Domain.Contexts.Catalog.Course;
type CourseQuery = Domain.Contexts.Catalog.Course.CourseQuery;
interface QueryError {
	field: string;
	message: string;
}
type QueryResult = { ok: true; query: CourseQuery } | { ok: false; details: QueryError[] };
const allowedKeys = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

function optionalValue(params: URLSearchParams, field: string): string | undefined {
	const value = params.get(field);
	if (value === null || value.trim() === '') return undefined;
	return value;
}

function enumValue<T extends string>(value: string | undefined, field: string, allowed: readonly T[], details: QueryError[]): T | undefined {
	if (value === undefined) return undefined;
	const result = allowed.find((candidate) => candidate === value);
	if (result === undefined) details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	return result;
}

function integerValue(value: string | undefined, field: string, fallback: number, maximum: number, details: QueryError[]): number | undefined {
	if (value === undefined) return fallback;
	const message = field === 'pageSize' ? `pageSize must be between 1 and ${maximum}.` : 'page must be a positive safe integer.';
	if (!/^\d+$/.test(value)) {
		details.push({ field, message });
		return undefined;
	}
	const number = Number(value);
	if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
		details.push({ field, message });
		return undefined;
	}
	return number;
}

export function parseCourseQuery(params: URLSearchParams): QueryResult {
	const details: QueryError[] = [];
	for (const field of new Set(params.keys())) {
		if (!allowedKeys.has(field)) details.push({ field, message: 'Unknown query parameter.' });
		if (params.getAll(field).length > 1) details.push({ field, message: 'Query parameter must be supplied only once.' });
	}
	const modality = enumValue(optionalValue(params, 'modality'), 'modality', Values.MODALITIES, details);
	const status = enumValue(optionalValue(params, 'status'), 'status', Values.STATUSES, details);
	const rawSort = optionalValue(params, 'sort');
	const sort = rawSort === undefined ? Values.DEFAULT_SORT : enumValue(rawSort, 'sort', Values.SORT_FIELDS, details);
	const page = integerValue(optionalValue(params, 'page'), 'page', Values.DEFAULT_PAGE, Number.MAX_SAFE_INTEGER, details);
	const pageSize = integerValue(optionalValue(params, 'pageSize'), 'pageSize', Values.DEFAULT_PAGE_SIZE, Values.MAX_PAGE_SIZE, details);
	if (details.length > 0 || page === undefined || pageSize === undefined || sort === undefined) return { ok: false, details };
	const query: CourseQuery = { page, pageSize, sort };
	if (modality !== undefined) query.modality = modality;
	if (status !== undefined) query.status = status;
	const q = optionalValue(params, 'q');
	const tag = optionalValue(params, 'tag');
	if (q !== undefined) query.q = q.trim();
	if (tag !== undefined) query.tag = tag.trim();
	return { ok: true, query };
}
