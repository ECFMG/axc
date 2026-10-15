import { Domain } from '@axc/domain';

const { COURSE_MODALITIES, COURSE_STATUSES, COURSE_SORT_FIELDS, COURSE_DEFAULT_PAGE, COURSE_DEFAULT_PAGE_SIZE, COURSE_MAX_PAGE_SIZE, COURSE_DEFAULT_SORT } = Domain.Contexts.Catalog.Course;
const COURSE_QUERY_PARAMETERS = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];
interface CourseQueryErrorDetail {
	field: string;
	message: string;
}
type CourseQueryParseResult = { success: true; criteria: Domain.Contexts.Catalog.Course.CourseSearchCriteria } | { success: false; details: CourseQueryErrorDetail[] };

function optionalValue(query: URLSearchParams, field: string): string | undefined {
	const value = query.get(field);
	if (value === null || value.trim() === '') {
		return undefined;
	}
	return value;
}

function enumValue<T extends string>(field: string, value: string | undefined, allowed: readonly T[], details: CourseQueryErrorDetail[]): T | undefined {
	if (value === undefined) {
		return undefined;
	}
	const match = allowed.find((candidate) => candidate === value);
	if (match === undefined) {
		details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	}
	return match;
}

function positiveInteger(field: string, value: string | undefined, maximum: number, details: CourseQueryErrorDetail[]): number | undefined {
	if (value === undefined) {
		return undefined;
	}
	const message = field === 'pageSize' ? `pageSize must be between 1 and ${COURSE_MAX_PAGE_SIZE}.` : 'page must be a positive safe integer.';
	if (!/^[0-9]+$/.test(value)) {
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

export function parseCourseQuery(query: URLSearchParams): CourseQueryParseResult {
	const details: CourseQueryErrorDetail[] = [];
	for (const field of new Set(query.keys())) {
		if (!COURSE_QUERY_PARAMETERS.includes(field)) {
			details.push({ field, message: 'Unknown query parameter.' });
		}
		if (query.getAll(field).length > 1) {
			details.push({ field, message: 'Query parameter must be supplied only once.' });
		}
	}
	const modality = enumValue('modality', optionalValue(query, 'modality'), COURSE_MODALITIES, details);
	const status = enumValue('status', optionalValue(query, 'status'), COURSE_STATUSES, details);
	const sort = enumValue('sort', optionalValue(query, 'sort'), COURSE_SORT_FIELDS, details);
	const page = positiveInteger('page', optionalValue(query, 'page'), Number.MAX_SAFE_INTEGER, details);
	const pageSize = positiveInteger('pageSize', optionalValue(query, 'pageSize'), COURSE_MAX_PAGE_SIZE, details);
	if (details.length > 0) {
		return { success: false, details };
	}
	const q = optionalValue(query, 'q')?.trim();
	const tag = optionalValue(query, 'tag')?.trim();
	return {
		success: true,
		criteria: {
			...(q === undefined ? {} : { q }),
			...(modality === undefined ? {} : { modality }),
			...(status === undefined ? {} : { status }),
			...(tag === undefined ? {} : { tag }),
			page: page ?? COURSE_DEFAULT_PAGE,
			pageSize: pageSize ?? COURSE_DEFAULT_PAGE_SIZE,
			sort: sort ?? COURSE_DEFAULT_SORT,
		},
	};
}
