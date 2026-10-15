import { Domain } from '@axc/domain';

const Course = Domain.Contexts.Catalog.Course;
type Criteria = Domain.Contexts.Catalog.Course.CourseSearchCriteria;
interface QueryDetail {
	field: string;
	message: string;
}
type CourseQueryResult = { criteria: Criteria } | { details: QueryDetail[] };
const courseQueryFields = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'];

function optionalText(params: URLSearchParams, field: string): string | undefined {
	const value = params.get(field)?.trim();
	return value === '' ? undefined : value;
}

function enumParameter<T extends string>(params: URLSearchParams, field: string, values: readonly T[], details: QueryDetail[]): T | undefined {
	const value = optionalText(params, field);
	if (value === undefined) {
		return undefined;
	}
	const match = values.find((allowed) => allowed === value);
	if (match === undefined) {
		details.push({ field, message: `${field} must be one of: ${values.join(', ')}.` });
	}
	return match;
}

function integerParameter(params: URLSearchParams, field: string, defaultValue: number, maximum: number, details: QueryDetail[]): number | undefined {
	if (optionalText(params, field) === undefined) {
		return defaultValue;
	}
	const raw = params.get(field);
	const message = field === 'pageSize' ? `pageSize must be between 1 and ${Course.COURSE_MAX_PAGE_SIZE}.` : 'page must be a positive safe integer.';
	if (raw === null || !/^[0-9]+$/.test(raw)) {
		details.push({ field, message });
		return undefined;
	}
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
		details.push({ field, message });
		return undefined;
	}
	return value;
}

export function parseCourseQuery(params: URLSearchParams): CourseQueryResult {
	const details: QueryDetail[] = [];
	for (const field of new Set(params.keys())) {
		if (!courseQueryFields.includes(field)) {
			details.push({ field, message: 'Unknown query parameter.' });
		} else if (params.getAll(field).length > 1) {
			details.push({ field, message: 'Query parameter must be supplied only once.' });
		}
	}
	const q = optionalText(params, 'q');
	const tag = optionalText(params, 'tag');
	const modality = enumParameter(params, 'modality', Course.COURSE_MODALITIES, details);
	const status = enumParameter(params, 'status', Course.COURSE_STATUSES, details);
	const parsedSort = enumParameter(params, 'sort', Course.COURSE_SORTS, details);
	const page = integerParameter(params, 'page', Course.COURSE_DEFAULT_PAGE, Number.MAX_SAFE_INTEGER, details);
	const pageSize = integerParameter(params, 'pageSize', Course.COURSE_DEFAULT_PAGE_SIZE, Course.COURSE_MAX_PAGE_SIZE, details);
	if (details.length > 0 || page === undefined || pageSize === undefined) {
		return { details };
	}
	const criteria: Criteria = { page, pageSize, sort: parsedSort ?? Course.COURSE_SORTS[0] };
	if (q !== undefined) {
		criteria.q = q;
	}
	if (tag !== undefined) {
		criteria.tag = tag;
	}
	if (modality !== undefined) {
		criteria.modality = modality;
	}
	if (status !== undefined) {
		criteria.status = status;
	}
	return { criteria };
}
