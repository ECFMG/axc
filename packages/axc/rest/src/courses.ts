import { COURSE_SORT_FIELDS, type CourseSearchInput, DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT, MAX_COURSE_PAGE_SIZE } from '@axc/application-services';
import { COURSE_MODALITIES, COURSE_STATUSES } from '@axc/domain';

interface QueryErrorDetail {
	field: string;
	message: string;
}

type CourseQueryResult = { success: true; input: CourseSearchInput } | { success: false; details: QueryErrorDetail[] };
const allowedParameters = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

function optionalValue(parameters: URLSearchParams, field: string): string | undefined {
	const value = parameters.get(field);
	return value === null || value.trim() === '' ? undefined : value;
}

function enumValue<T extends string>(value: string | undefined, field: string, allowed: readonly T[], details: QueryErrorDetail[]): T | undefined {
	if (value === undefined) return undefined;
	const match = allowed.find((candidate) => candidate === value);
	if (match === undefined) details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	return match;
}

function positiveInteger(value: string, field: string, maximum: number, details: QueryErrorDetail[]): number | undefined {
	const message = field === 'pageSize' ? `pageSize must be between 1 and ${MAX_COURSE_PAGE_SIZE}.` : 'page must be a positive safe integer.';
	if (!/^[1-9]\d*$/.test(value)) {
		details.push({ field, message });
		return undefined;
	}
	const number = Number(value);
	if (!Number.isSafeInteger(number) || number > maximum) {
		details.push({ field, message });
		return undefined;
	}
	return number;
}

export function parseCourseQuery(parameters: URLSearchParams): CourseQueryResult {
	const details: QueryErrorDetail[] = [];
	for (const field of new Set(parameters.keys())) {
		if (!allowedParameters.has(field)) {
			details.push({ field, message: 'Unknown query parameter.' });
		}
		if (parameters.getAll(field).length > 1) {
			details.push({ field, message: 'Query parameter must be supplied only once.' });
		}
	}
	const modality = enumValue(optionalValue(parameters, 'modality'), 'modality', COURSE_MODALITIES, details);
	const status = enumValue(optionalValue(parameters, 'status'), 'status', COURSE_STATUSES, details);
	const sort = enumValue(optionalValue(parameters, 'sort') ?? DEFAULT_COURSE_SORT, 'sort', COURSE_SORT_FIELDS, details);
	const page = positiveInteger(optionalValue(parameters, 'page') ?? String(DEFAULT_COURSE_PAGE), 'page', Number.MAX_SAFE_INTEGER, details);
	const pageSize = positiveInteger(optionalValue(parameters, 'pageSize') ?? String(DEFAULT_COURSE_PAGE_SIZE), 'pageSize', MAX_COURSE_PAGE_SIZE, details);
	if (details.length > 0 || sort === undefined || page === undefined || pageSize === undefined) {
		return { success: false, details };
	}
	const q = optionalValue(parameters, 'q')?.trim();
	const tag = optionalValue(parameters, 'tag')?.trim();
	return {
		success: true,
		input: {
			page,
			pageSize,
			sort,
			...(q === undefined ? {} : { q }),
			...(tag === undefined ? {} : { tag }),
			...(modality === undefined ? {} : { modality }),
			...(status === undefined ? {} : { status }),
		},
	};
}
