import {
	COURSE_MODALITIES,
	COURSE_SORT_FIELDS,
	COURSE_STATUSES,
	type CourseCatalogRepository,
	type CoursePage,
	type CourseSearchCriteria,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	DEFAULT_COURSE_SORT,
	isCourseModality,
	isCourseSortField,
	isCourseStatus,
	MAX_COURSE_PAGE_SIZE,
} from '@axc/domain';

export const INVALID_QUERY_PARAMETER = 'INVALID_QUERY_PARAMETER' as const;

const MAX_KEYWORD_LENGTH = 100;
const SUPPORTED_PARAMETERS = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'] as const;
type SupportedParameter = (typeof SUPPORTED_PARAMETERS)[number];

/** Raw query string values as delivered by the HTTP layer. Repeated keys arrive as several values. */
export type CourseSearchQuery = Readonly<Record<string, readonly string[] | undefined>>;

export interface QueryParameterError {
	field: string;
	message: string;
}

export interface CourseSearchError {
	error: {
		code: typeof INVALID_QUERY_PARAMETER;
		message: string;
		details: QueryParameterError[];
	};
}

export type CourseSearchResult = { ok: true; value: CoursePage } | { ok: false; error: CourseSearchError };

export interface CourseCatalogService {
	search(query: CourseSearchQuery): Promise<CourseSearchResult>;
}

type ParseResult = { ok: true; criteria: CourseSearchCriteria } | { ok: false; details: QueryParameterError[] };

/** Validates raw query values into search criteria. Every invalid parameter is reported, not just the first. */
function parseCourseSearchQuery(query: CourseSearchQuery): ParseResult {
	const details: QueryParameterError[] = [];
	const single = (field: SupportedParameter): string | undefined => {
		const values = query[field];
		if (values === undefined || values.length === 0) {
			return undefined;
		}
		if (values.length > 1) {
			details.push({ field, message: `${field} must be provided at most once.` });
			return undefined;
		}
		return values[0];
	};

	for (const field of Object.keys(query)) {
		if (!(SUPPORTED_PARAMETERS as readonly string[]).includes(field)) {
			details.push({ field, message: `${field} is not a supported query parameter.` });
		}
	}

	const q = text(single('q'), 'q', details);
	const tag = text(single('tag'), 'tag', details);

	const modality = oneOf(single('modality'), 'modality', COURSE_MODALITIES, isCourseModality, details);
	const status = oneOf(single('status'), 'status', COURSE_STATUSES, isCourseStatus, details);
	const sort = oneOf(single('sort'), 'sort', COURSE_SORT_FIELDS, isCourseSortField, details) ?? DEFAULT_COURSE_SORT;
	const page = integer(single('page'), 'page', DEFAULT_COURSE_PAGE, Number.MAX_SAFE_INTEGER, 'page must be a positive integer.', details);
	const pageSize = integer(single('pageSize'), 'pageSize', DEFAULT_COURSE_PAGE_SIZE, MAX_COURSE_PAGE_SIZE, `pageSize must be between 1 and ${MAX_COURSE_PAGE_SIZE}.`, details);

	if (details.length > 0) {
		return { ok: false, details };
	}

	return {
		ok: true,
		criteria: {
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

export function createCourseCatalogService(repository: CourseCatalogRepository): CourseCatalogService {
	return {
		async search(query) {
			const parsed = parseCourseSearchQuery(query);
			if (!parsed.ok) {
				return {
					ok: false,
					error: {
						error: {
							code: INVALID_QUERY_PARAMETER,
							message: 'One or more query parameters are invalid.',
							details: parsed.details,
						},
					},
				};
			}
			return { ok: true, value: await repository.search(parsed.criteria) };
		},
	};
}

function text(raw: string | undefined, field: SupportedParameter, details: QueryParameterError[]): string | undefined {
	if (raw === undefined) {
		return undefined;
	}
	const trimmed = raw.trim();
	if (trimmed.length === 0 || trimmed.length > MAX_KEYWORD_LENGTH) {
		details.push({ field, message: `${field} must be between 1 and ${MAX_KEYWORD_LENGTH} characters.` });
		return undefined;
	}
	return trimmed;
}

/** Returns the value when it is one of the allowed values, otherwise records an error. Absent values stay undefined. */
function oneOf<T extends string>(raw: string | undefined, field: SupportedParameter, allowed: readonly T[], guard: (value: string) => value is T, details: QueryParameterError[]): T | undefined {
	if (raw === undefined || guard(raw)) {
		return raw;
	}
	details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
	return undefined;
}

/** Parses a base-10 integer in [1, max]. Returns the fallback when absent; records an error when invalid. */
function integer(raw: string | undefined, field: SupportedParameter, fallback: number, max: number, message: string, details: QueryParameterError[]): number {
	if (raw === undefined) {
		return fallback;
	}
	const value = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
	if (value >= 1 && value <= max) {
		return value;
	}
	details.push({ field, message });
	return fallback;
}
