import { COURSE_MODALITIES, COURSE_SORT_FIELDS, COURSE_STATUSES, type CourseSearch } from '@axc/domain';

interface QueryError {
	field: string;
	message: string;
}
type ParsedQuery = { success: true; query: CourseSearch } | { success: false; details: QueryError[] };
const allowedFields = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

export function parseCourseQuery(params: URLSearchParams): ParsedQuery {
	const details: QueryError[] = [];
	for (const field of new Set(params.keys())) {
		if (!allowedFields.has(field)) details.push({ field, message: 'Unknown query parameter.' });
		else if (params.getAll(field).length > 1) details.push({ field, message: 'Query parameter must appear only once.' });
	}
	const enumValue = <T extends string>(field: string, values: readonly T[], fallback?: T): T | undefined => {
		const value = params.get(field);
		if (value === null) return fallback;
		const match = values.find((candidate) => candidate === value);
		if (match === undefined) details.push({ field, message: `${field} must be one of: ${values.join(', ')}.` });
		return match;
	};
	const integer = (field: string, fallback: number, maximum: number): number => {
		const value = params.get(field);
		if (value === null) return fallback;
		const number = Number(value);
		if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(number) || number < 1 || number > maximum) {
			details.push({ field, message: `${field} must be between 1 and ${maximum}.` });
		}
		return number;
	};
	const modality = enumValue('modality', COURSE_MODALITIES);
	const status = enumValue('status', COURSE_STATUSES);
	const sort = enumValue('sort', COURSE_SORT_FIELDS, 'title');
	const page = integer('page', 1, Number.MAX_SAFE_INTEGER);
	const pageSize = integer('pageSize', 10, 50);
	if (details.length > 0 || sort === undefined) return { success: false, details };
	const query: CourseSearch = { page, pageSize, sort };
	const q = params.get('q')?.trim();
	const tag = params.get('tag')?.trim();
	if (q) query.q = q;
	if (tag) query.tag = tag;
	if (modality !== undefined) query.modality = modality;
	if (status !== undefined) query.status = status;
	return { success: true, query };
}
