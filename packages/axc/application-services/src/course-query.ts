import {
	COURSE_MODALITIES,
	COURSE_SORT_FIELDS,
	COURSE_STATUSES,
	type CourseModality,
	type CourseSearchCriteria,
	type CourseSortField,
	type CourseStatus,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	DEFAULT_COURSE_SORT_FIELD,
	isCourseModality,
	isCourseSortField,
	isCourseStatus,
	MAX_COURSE_PAGE_SIZE,
} from '@axc/domain';

/** Raw, untrusted query string values as they arrive from the transport layer. */
export type RawCourseQuery = Readonly<Record<string, string | undefined>>;

/** A single rejected query parameter. */
export interface QueryParameterError {
	/** Name of the query parameter that failed validation. */
	readonly field: string;
	/** Caller-facing explanation of the constraint that was violated. */
	readonly message: string;
}

/** Result of validating a raw course query. */
export type ParsedCourseQuery = { readonly ok: true; readonly criteria: CourseSearchCriteria } | { readonly ok: false; readonly errors: readonly QueryParameterError[] };

const INTEGER_PATTERN = /^\d+$/;

/**
 * Validates raw `GET /api/courses` query parameters and resolves them to search criteria.
 *
 * @remarks
 * Every parameter is checked, so a caller sending two bad values is told about both
 * rather than only the first. A parameter that is absent, empty, or whitespace-only is
 * treated as "not supplied" and falls back to its default. Unrecognised parameters are
 * ignored rather than rejected, so callers may append cache-busting or tracing keys.
 *
 * @param raw - Query parameters exactly as received.
 * @returns Resolved criteria, or the list of parameters that failed validation.
 */
export function parseCourseSearchQuery(raw: RawCourseQuery): ParsedCourseQuery {
	const errors: QueryParameterError[] = [];

	const keyword = readOptionalText(raw, 'q');
	const tag = readOptionalText(raw, 'tag');

	const modality = readEnum(raw, 'modality', isCourseModality, COURSE_MODALITIES, errors);
	const status = readEnum(raw, 'status', isCourseStatus, COURSE_STATUSES, errors);
	const sort = readEnum(raw, 'sort', isCourseSortField, COURSE_SORT_FIELDS, errors) ?? DEFAULT_COURSE_SORT_FIELD;

	const page = readBoundedInteger(raw, 'page', 1, Number.MAX_SAFE_INTEGER, DEFAULT_COURSE_PAGE, 'page must be an integer greater than or equal to 1.', errors);
	const pageSize = readBoundedInteger(raw, 'pageSize', 1, MAX_COURSE_PAGE_SIZE, DEFAULT_COURSE_PAGE_SIZE, `pageSize must be between 1 and ${MAX_COURSE_PAGE_SIZE}.`, errors);

	if (errors.length > 0) {
		return { ok: false, errors };
	}

	return {
		ok: true,
		criteria: {
			keyword,
			modality,
			status,
			tag,
			page: page ?? DEFAULT_COURSE_PAGE,
			pageSize: pageSize ?? DEFAULT_COURSE_PAGE_SIZE,
			sort,
		},
	};
}

function readOptionalText(raw: RawCourseQuery, field: string): string | undefined {
	const value = raw[field];
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

function readEnum<T extends CourseModality | CourseStatus | CourseSortField>(raw: RawCourseQuery, field: string, isAllowed: (value: string) => value is T, allowed: readonly string[], errors: QueryParameterError[]): T | undefined {
	const value = readOptionalText(raw, field);
	if (value === undefined) {
		return undefined;
	}
	if (isAllowed(value)) {
		return value;
	}
	errors.push({ field, message: `${field} must be one of ${allowed.join(', ')}.` });
	return undefined;
}

function readBoundedInteger(raw: RawCourseQuery, field: string, minimum: number, maximum: number, fallback: number, message: string, errors: QueryParameterError[]): number | undefined {
	const value = readOptionalText(raw, field);
	if (value === undefined) {
		return fallback;
	}
	if (!INTEGER_PATTERN.test(value)) {
		errors.push({ field, message });
		return undefined;
	}
	const parsed = Number.parseInt(value, 10);
	if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
		errors.push({ field, message });
		return undefined;
	}
	return parsed;
}
