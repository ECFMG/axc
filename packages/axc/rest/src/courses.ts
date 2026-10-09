import { COURSE_SORT_FIELDS, type CourseSearch } from '@axc/application-services';
import { COURSE_MODALITIES, COURSE_STATUSES } from '@axc/domain';

interface QueryErrorDetail {
	field: string;
	message: string;
}

type ParsedCourseQuery = { query: CourseSearch; details?: never } | { details: QueryErrorDetail[]; query?: never };

export function parseCourseQuery(params: URLSearchParams): ParsedCourseQuery {
	const details: QueryErrorDetail[] = [];
	const allowed = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
	for (const field of new Set(params.keys())) {
		if (!allowed.includes(field)) details.push({ field, message: 'Unknown query parameter.' });
		else if (params.getAll(field).length > 1) details.push({ field, message: 'Query parameter must be provided once.' });
	}
	function enumValue<T extends string>(field: string, values: readonly T[]): T | undefined {
		const value = params.get(field);
		if (value === null) return undefined;
		const match = values.find((candidate) => candidate === value);
		if (match === undefined) details.push({ field, message: `${field} must be one of: ${values.join(', ')}.` });
		return match;
	}
	function integer(field: string, fallback: number, maximum = Number.MAX_SAFE_INTEGER): number {
		const raw = params.get(field);
		if (raw === null) return fallback;
		const value = Number(raw);
		if (!/^[0-9]+$/.test(raw) || !Number.isSafeInteger(value) || value < 1 || value > maximum) {
			details.push({ field, message: field === 'pageSize' ? 'pageSize must be between 1 and 50.' : 'page must be a positive safe integer.' });
		}
		return value;
	}
	const modality = enumValue('modality', COURSE_MODALITIES);
	const status = enumValue('status', COURSE_STATUSES);
	const sort = enumValue('sort', COURSE_SORT_FIELDS) ?? 'title';
	const page = integer('page', 1);
	const pageSize = integer('pageSize', 10, 50);
	if (details.length) return { details };
	return {
		query: {
			...(params.has('q') ? { q: params.get('q')?.trim() ?? '' } : {}),
			...(params.has('tag') ? { tag: params.get('tag')?.trim() ?? '' } : {}),
			...(modality ? { modality } : {}),
			...(status ? { status } : {}),
			page,
			pageSize,
			sort,
		},
	};
}
