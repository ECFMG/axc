import {
	COURSE_MODALITIES,
	COURSE_SORT_FIELDS,
	COURSE_STATUSES,
	type CourseSearchCriteria,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	DEFAULT_COURSE_SORT_FIELD,
	isCourseModality,
	isCourseSortField,
	isCourseStatus,
	MAX_COURSE_PAGE_SIZE,
} from '@axc/domain';

/** Raw, unvalidated query string values as they arrive from the transport layer. */
export interface CourseSearchQueryInput {
	readonly q?: string | undefined;
	readonly modality?: string | undefined;
	readonly status?: string | undefined;
	readonly tag?: string | undefined;
	readonly page?: string | undefined;
	readonly pageSize?: string | undefined;
	readonly sort?: string | undefined;
}

/** One rejected query parameter, reported back to the caller. */
export interface CourseSearchFieldError {
	readonly field: string;
	readonly message: string;
}

type CourseSearchQueryValidation = { readonly valid: true; readonly criteria: CourseSearchCriteria } | { readonly valid: false; readonly errors: readonly CourseSearchFieldError[] };

/**
 * Turns raw catalog query parameters into {@link CourseSearchCriteria}.
 *
 * @remarks
 * Every parameter is checked before any is rejected, so a caller sending several
 * bad values sees all of them in one response. Absent, empty, and whitespace-only
 * `q` and `tag` values mean "no filter" rather than a validation failure.
 * Unrecognised parameters are ignored.
 */
export function validateCourseSearchQuery(input: CourseSearchQueryInput): CourseSearchQueryValidation {
	const errors: CourseSearchFieldError[] = [];

	const keyword = optionalText(input.q);
	const tag = optionalText(input.tag);

	const modality = optionalText(input.modality);
	if (modality !== undefined && !isCourseModality(modality)) {
		errors.push({ field: 'modality', message: `modality must be one of ${list(COURSE_MODALITIES)}.` });
	}

	const status = optionalText(input.status);
	if (status !== undefined && !isCourseStatus(status)) {
		errors.push({ field: 'status', message: `status must be one of ${list(COURSE_STATUSES)}.` });
	}

	const page = optionalText(input.page);
	const parsedPage = page === undefined ? DEFAULT_COURSE_PAGE : parseCount(page);
	if (parsedPage === undefined || parsedPage < 1) {
		errors.push({ field: 'page', message: 'page must be an integer of 1 or greater.' });
	}

	const pageSize = optionalText(input.pageSize);
	const parsedPageSize = pageSize === undefined ? DEFAULT_COURSE_PAGE_SIZE : parseCount(pageSize);
	if (parsedPageSize === undefined || parsedPageSize < 1 || parsedPageSize > MAX_COURSE_PAGE_SIZE) {
		errors.push({ field: 'pageSize', message: `pageSize must be between 1 and ${MAX_COURSE_PAGE_SIZE}.` });
	}

	const sort = optionalText(input.sort);
	if (sort !== undefined && !isCourseSortField(sort)) {
		errors.push({ field: 'sort', message: `sort must be one of ${list(COURSE_SORT_FIELDS)}.` });
	}

	if (errors.length > 0) {
		return { valid: false, errors };
	}

	return {
		valid: true,
		criteria: {
			keyword,
			modality: modality !== undefined && isCourseModality(modality) ? modality : undefined,
			status: status !== undefined && isCourseStatus(status) ? status : undefined,
			tag,
			page: parsedPage ?? DEFAULT_COURSE_PAGE,
			pageSize: parsedPageSize ?? DEFAULT_COURSE_PAGE_SIZE,
			sort: sort !== undefined && isCourseSortField(sort) ? sort : DEFAULT_COURSE_SORT_FIELD,
		},
	};
}

function optionalText(value: string | undefined): string | undefined {
	const trimmed = value?.trim() ?? '';
	return trimmed.length === 0 ? undefined : trimmed;
}

function parseCount(value: string): number | undefined {
	if (!/^\d+$/.test(value)) {
		return undefined;
	}
	const parsed = Number.parseInt(value, 10);
	return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function list(values: readonly string[]): string {
	return values.join(', ');
}
