import { COURSE_SORT_FIELDS, type CourseSearch } from '@axc/application-services';
import { COURSE_MODALITIES, COURSE_STATUSES } from '@axc/domain';

interface QueryDetail {
	field: string;
	message: string;
}

type ParsedQuery = { input: CourseSearch; details?: never } | { input?: never; details: QueryDetail[] };

export function parseCourseQuery(params: URLSearchParams): ParsedQuery {
	const details: QueryDetail[] = [];
	const allowed = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
	for (const field of new Set(params.keys())) {
		if (!allowed.includes(field)) details.push({ field, message: 'Unknown query parameter.' });
		if (params.getAll(field).length > 1) details.push({ field, message: 'Query parameter must appear only once.' });
	}
	const modality = enumValue('modality', COURSE_MODALITIES);
	const status = enumValue('status', COURSE_STATUSES);
	const sort = enumValue('sort', COURSE_SORT_FIELDS) ?? 'title';
	const page = integer('page', 1, Number.MAX_SAFE_INTEGER);
	const pageSize = integer('pageSize', 10, 50);
	const q = params.get('q')?.trim();
	const tag = params.get('tag')?.trim();
	if (details.length) return { details };
	return { input: { page, pageSize, sort, ...(q ? { q } : {}), ...(tag ? { tag } : {}), ...(modality ? { modality } : {}), ...(status ? { status } : {}) } };

	function enumValue<T extends string>(field: string, values: readonly T[]): T | undefined {
		const raw = params.get(field);
		if (raw === null) return undefined;
		const match = values.find((value) => value === raw);
		if (match === undefined) details.push({ field, message: `${field} must be one of: ${values.join(', ')}.` });
		return match;
	}

	function integer(field: string, fallback: number, max: number): number {
		const raw = params.get(field);
		if (raw === null) return fallback;
		const value = Number(raw);
		if (!/^[0-9]+$/.test(raw) || !Number.isSafeInteger(value) || value < 1 || value > max) {
			details.push({ field, message: `${field} must be between 1 and ${max}.` });
		}
		return value;
	}
}
