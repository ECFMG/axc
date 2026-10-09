import { COURSE_MODALITIES, COURSE_SORTS, COURSE_STATUSES, type CourseSearch, DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, MAX_COURSE_PAGE_SIZE } from '@axc/application-services';

interface QueryIssue {
	field: string;
	message: string;
}

type QueryResult = { query: CourseSearch; details?: never } | { details: QueryIssue[]; query?: never };
const fields = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];

export function parseCourseQuery(parameters: URLSearchParams): QueryResult {
	const details: QueryIssue[] = [];
	for (const field of new Set(parameters.keys())) {
		if (!fields.includes(field)) details.push({ field, message: 'Unknown query parameter.' });
		if (parameters.getAll(field).length > 1) details.push({ field, message: 'Query parameter must be supplied only once.' });
	}
	const modality = enumValue(parameters, 'modality', COURSE_MODALITIES, details);
	const status = enumValue(parameters, 'status', COURSE_STATUSES, details);
	const sort = enumValue(parameters, 'sort', COURSE_SORTS, details) ?? 'title';
	const page = integerValue(parameters, 'page', DEFAULT_COURSE_PAGE, Number.MAX_SAFE_INTEGER, details);
	const pageSize = integerValue(parameters, 'pageSize', DEFAULT_COURSE_PAGE_SIZE, MAX_COURSE_PAGE_SIZE, details);
	if (details.length) return { details };
	return {
		query: {
			page,
			pageSize,
			sort,
			...(modality === undefined ? {} : { modality }),
			...(status === undefined ? {} : { status }),
			...(parameters.has('q') ? { q: parameters.get('q') ?? '' } : {}),
			...(parameters.has('tag') ? { tag: parameters.get('tag') ?? '' } : {}),
		},
	};
}

function enumValue<T extends string>(parameters: URLSearchParams, field: string, allowed: readonly T[], details: QueryIssue[]): T | undefined {
	const value = parameters.get(field);
	if (value === null) return undefined;
	const match = allowed.find((candidate) => candidate === value);
	if (match === undefined) details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	return match;
}

function integerValue(parameters: URLSearchParams, field: string, fallback: number, maximum: number, details: QueryIssue[]): number {
	const value = parameters.get(field);
	if (value === null) return fallback;
	const number = Number(value);
	if (!/^[0-9]+$/.test(value) || !Number.isSafeInteger(number) || number < 1 || number > maximum) {
		details.push({ field, message: field === 'pageSize' ? `pageSize must be between 1 and ${MAX_COURSE_PAGE_SIZE}.` : 'page must be a positive safe integer.' });
	}
	return number;
}
