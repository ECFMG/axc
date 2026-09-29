import { COURSE_MODALITIES, COURSE_STATUSES, type CourseModality, type CourseStatus, isCourseModality, isCourseStatus } from './course.ts';

/** Fields the catalog can be ordered by. */
export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export const DEFAULT_COURSE_PAGE = 1;
export const DEFAULT_COURSE_PAGE_SIZE = 10;
export const MAX_COURSE_PAGE_SIZE = 50;
export const DEFAULT_COURSE_SORT_FIELD: CourseSortField = 'title';
/** Upper bound on `q`, so a search cannot be used to push an unbounded string through the catalog. */
export const MAX_COURSE_KEYWORD_LENGTH = 200;

export function isCourseSortField(value: string): value is CourseSortField {
	return (COURSE_SORT_FIELDS as readonly string[]).includes(value);
}

/** A validated, normalised catalog query. Keyword and tag are lower-cased so matching is case-insensitive. */
export interface CourseSearchCriteria {
	readonly keyword: string | undefined;
	readonly modality: CourseModality | undefined;
	readonly status: CourseStatus | undefined;
	readonly tag: string | undefined;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

/** One rejected query parameter. */
export interface CourseSearchCriteriaViolation {
	readonly field: string;
	readonly message: string;
}

export type CourseSearchCriteriaParseResult = { readonly ok: true; readonly criteria: CourseSearchCriteria } | { readonly ok: false; readonly violations: readonly CourseSearchCriteriaViolation[] };

/**
 * Untrusted query string values, one named property per supported parameter.
 *
 * Declared as named properties rather than an index signature so that unrecognised
 * query parameters are dropped by the delivery layer instead of reaching the domain.
 */
export interface RawCourseSearchQuery {
	readonly q?: string | undefined;
	readonly modality?: string | undefined;
	readonly status?: string | undefined;
	readonly tag?: string | undefined;
	readonly page?: string | undefined;
	readonly pageSize?: string | undefined;
	readonly sort?: string | undefined;
}

/**
 * Validates and normalises raw query string values into {@link CourseSearchCriteria}.
 *
 * Every invalid parameter is reported, not just the first, so a caller can surface the
 * whole set in one error response. Absent and blank values fall back to the defaults.
 */
export function parseCourseSearchCriteria(raw: RawCourseSearchQuery): CourseSearchCriteriaParseResult {
	const violations: CourseSearchCriteriaViolation[] = [];

	const keyword = normalizeText(raw.q);
	if (keyword !== undefined && keyword.length > MAX_COURSE_KEYWORD_LENGTH) {
		violations.push({ field: 'q', message: `q must be ${MAX_COURSE_KEYWORD_LENGTH} characters or fewer.` });
	}

	const modality = parseEnum(raw.modality, 'modality', isCourseModality, COURSE_MODALITIES, violations);
	const status = parseEnum(raw.status, 'status', isCourseStatus, COURSE_STATUSES, violations);
	const sort = parseEnum(raw.sort, 'sort', isCourseSortField, COURSE_SORT_FIELDS, violations) ?? DEFAULT_COURSE_SORT_FIELD;
	const tag = normalizeText(raw.tag);

	const page = parsePositiveInteger(raw.page, 'page', DEFAULT_COURSE_PAGE, undefined, violations);
	const pageSize = parsePositiveInteger(raw.pageSize, 'pageSize', DEFAULT_COURSE_PAGE_SIZE, MAX_COURSE_PAGE_SIZE, violations);

	if (violations.length > 0) {
		return { ok: false, violations };
	}

	return {
		ok: true,
		criteria: {
			keyword: keyword?.toLowerCase(),
			modality,
			status,
			tag: tag?.toLowerCase(),
			page,
			pageSize,
			sort,
		},
	};
}

/** Trims a raw value and treats blank as absent, so `?q=` behaves like an omitted parameter. */
function normalizeText(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function parseEnum<T extends string>(value: string | undefined, field: string, isAllowed: (candidate: string) => candidate is T, allowed: readonly string[], violations: CourseSearchCriteriaViolation[]): T | undefined {
	const text = normalizeText(value);
	if (text === undefined) {
		return undefined;
	}
	if (isAllowed(text)) {
		return text;
	}
	violations.push({ field, message: `${field} must be one of ${allowed.join(', ')}.` });
	return undefined;
}

/**
 * Parses a bounded positive integer. Rejects anything that is not a run of digits — `1.5`,
 * `1e2`, `-1` and `abc` are all invalid rather than silently coerced.
 */
function parsePositiveInteger(value: string | undefined, field: string, fallback: number, max: number | undefined, violations: CourseSearchCriteriaViolation[]): number {
	const text = normalizeText(value);
	if (text === undefined) {
		return fallback;
	}
	const parsed = /^\d+$/.test(text) ? Number(text) : Number.NaN;
	if (!Number.isSafeInteger(parsed) || parsed < 1 || (max !== undefined && parsed > max)) {
		violations.push({ field, message: max === undefined ? `${field} must be an integer greater than or equal to 1.` : `${field} must be between 1 and ${max}.` });
		return fallback;
	}
	return parsed;
}
