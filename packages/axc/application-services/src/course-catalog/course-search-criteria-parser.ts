import type { ApiErrorDetail } from './api-error.ts';
import { COURSE_MODALITIES, COURSE_STATUSES, type CourseModality, type CourseStatus } from './course.ts';
import { COURSE_SORT_FIELDS, type CourseSearchCriteria, type CourseSortField, DEFAULT_PAGE, DEFAULT_PAGE_SIZE, DEFAULT_SORT, MAX_PAGE_SIZE } from './course-search-criteria.ts';

/** Raw query string parameters as delivered by the HTTP layer. */
export type CourseSearchQueryParameters = Readonly<Record<string, string | undefined>>;

/** Either the validated criteria or every reason the request was rejected. */
export type CourseSearchCriteriaParseResult = { readonly ok: true; readonly criteria: CourseSearchCriteria } | { readonly ok: false; readonly violations: readonly ApiErrorDetail[] };

/** Digits only, capped so that a very long numeric string is rejected rather than silently overflowing. */
const POSITIVE_INTEGER = /^\d{1,9}$/;

/**
 * Validates raw query string parameters against the catalog contract.
 *
 * Every violation is collected so a client sees all its mistakes in one response.
 * Blank values are treated as absent; `modality`, `status`, and `sort` are compared
 * case-insensitively against their allowed values.
 */
export function parseCourseSearchCriteria(query: CourseSearchQueryParameters): CourseSearchCriteriaParseResult {
	const violations: ApiErrorDetail[] = [];

	const q = readParameter(query, 'q');
	const modality = parseAllowedValue<CourseModality>('modality', readParameter(query, 'modality'), COURSE_MODALITIES, violations);
	const status = parseAllowedValue<CourseStatus>('status', readParameter(query, 'status'), COURSE_STATUSES, violations);
	const tag = readParameter(query, 'tag');
	const page = parseBoundedInteger('page', readParameter(query, 'page'), 1, Number.MAX_SAFE_INTEGER, DEFAULT_PAGE, 'page must be an integer greater than or equal to 1.', violations);
	const pageSize = parseBoundedInteger('pageSize', readParameter(query, 'pageSize'), 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, `pageSize must be between 1 and ${MAX_PAGE_SIZE}.`, violations);
	const sort = parseAllowedValue<CourseSortField>('sort', readParameter(query, 'sort'), COURSE_SORT_FIELDS, violations) ?? DEFAULT_SORT;

	if (violations.length > 0) {
		return { ok: false, violations };
	}
	return { ok: true, criteria: { q, modality, status, tag, page, pageSize, sort } };
}

/** Reads a parameter by name, collapsing missing and blank values to `undefined`. */
function readParameter(query: CourseSearchQueryParameters, name: string): string | undefined {
	const raw = query[name];
	if (raw === undefined) {
		return undefined;
	}
	const trimmed = raw.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

function parseAllowedValue<TValue extends string>(field: string, value: string | undefined, allowed: readonly TValue[], violations: ApiErrorDetail[]): TValue | undefined {
	if (value === undefined) {
		return undefined;
	}
	const normalized = value.toLowerCase();
	const match = allowed.find((candidate) => candidate.toLowerCase() === normalized);
	if (match === undefined) {
		violations.push({ field, message: `${field} must be one of ${allowed.join(', ')}.` });
		return undefined;
	}
	return match;
}

function parseBoundedInteger(field: string, value: string | undefined, minimum: number, maximum: number, fallback: number, message: string, violations: ApiErrorDetail[]): number {
	if (value === undefined) {
		return fallback;
	}
	if (!POSITIVE_INTEGER.test(value)) {
		violations.push({ field, message });
		return fallback;
	}
	const parsed = Number(value);
	if (parsed < minimum || parsed > maximum) {
		violations.push({ field, message });
		return fallback;
	}
	return parsed;
}
