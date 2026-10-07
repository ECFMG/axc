import {
	COURSE_MODALITIES,
	COURSE_SORT_FIELDS,
	COURSE_STATUSES,
	type CourseSearchCriteria,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	DEFAULT_COURSE_SORT,
	isCourseModality,
	isCourseSortField,
	isCourseStatus,
	MAX_COURSE_PAGE_SIZE,
	MIN_COURSE_PAGE_SIZE,
} from '@axc/domain';

/** Raw, untrusted query string values for a course catalog search. */
export interface CourseSearchQueryInput {
	readonly q?: string | undefined;
	readonly modality?: string | undefined;
	readonly status?: string | undefined;
	readonly tag?: string | undefined;
	readonly page?: string | undefined;
	readonly pageSize?: string | undefined;
	readonly sort?: string | undefined;
}

/** One rejected query parameter. */
export interface CourseSearchFieldError {
	readonly field: string;
	readonly message: string;
}

export type CourseSearchQueryValidation = { readonly outcome: 'valid'; readonly criteria: CourseSearchCriteria } | { readonly outcome: 'invalid'; readonly errors: readonly CourseSearchFieldError[] };

const WHOLE_NUMBER = /^\d+$/;

/**
 * Validates raw query string values and normalizes them into search criteria.
 *
 * @remarks
 * Every invalid parameter is reported, not just the first. Blank and whitespace-only `q` and
 * `tag` values are treated as absent. Unrecognized query parameters are ignored.
 */
export function parseCourseSearchQuery(query: CourseSearchQueryInput): CourseSearchQueryValidation {
	const errors: CourseSearchFieldError[] = [];

	const modality = readEnum(query.modality, 'modality', isCourseModality, COURSE_MODALITIES, errors);
	const status = readEnum(query.status, 'status', isCourseStatus, COURSE_STATUSES, errors);
	const sortField = readEnum(query.sort, 'sort', isCourseSortField, COURSE_SORT_FIELDS, errors);
	const page = readPage(query.page, errors);
	const pageSize = readPageSize(query.pageSize, errors);

	if (errors.length > 0) {
		return { outcome: 'invalid', errors };
	}

	return {
		outcome: 'valid',
		criteria: {
			keyword: presentValue(query.q),
			modality,
			status,
			tag: presentValue(query.tag),
			page: page ?? DEFAULT_COURSE_PAGE,
			pageSize: pageSize ?? DEFAULT_COURSE_PAGE_SIZE,
			sort: sortField ?? DEFAULT_COURSE_SORT,
		},
	};
}

/** Trimmed value, or `undefined` when the caller omitted it or sent only whitespace. */
function presentValue(raw: string | undefined): string | undefined {
	const trimmed = raw?.trim();
	return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function readEnum<T extends string>(raw: string | undefined, field: string, isAllowed: (value: string) => value is T, allowed: readonly string[], errors: CourseSearchFieldError[]): T | undefined {
	const value = presentValue(raw);
	if (value === undefined) {
		return undefined;
	}
	if (!isAllowed(value)) {
		errors.push({ field, message: `${field} must be one of ${allowed.join(', ')}.` });
		return undefined;
	}
	return value;
}

function readPage(raw: string | undefined, errors: CourseSearchFieldError[]): number | undefined {
	const value = presentValue(raw);
	if (value === undefined) {
		return undefined;
	}
	const page = readWholeNumber(value);
	if (page === undefined || page < DEFAULT_COURSE_PAGE) {
		errors.push({ field: 'page', message: `page must be an integer greater than or equal to ${DEFAULT_COURSE_PAGE}.` });
		return undefined;
	}
	return page;
}

function readPageSize(raw: string | undefined, errors: CourseSearchFieldError[]): number | undefined {
	const value = presentValue(raw);
	if (value === undefined) {
		return undefined;
	}
	const pageSize = readWholeNumber(value);
	if (pageSize === undefined || pageSize < MIN_COURSE_PAGE_SIZE || pageSize > MAX_COURSE_PAGE_SIZE) {
		errors.push({ field: 'pageSize', message: `pageSize must be between ${MIN_COURSE_PAGE_SIZE} and ${MAX_COURSE_PAGE_SIZE}.` });
		return undefined;
	}
	return pageSize;
}

function readWholeNumber(value: string): number | undefined {
	if (!WHOLE_NUMBER.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) ? parsed : undefined;
}
