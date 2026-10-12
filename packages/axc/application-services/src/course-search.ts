import { COURSE_MODALITIES, COURSE_SORT_FIELDS, COURSE_STATUSES, type Course, type CourseSearchCriteria } from '@axc/domain';
import type { CourseRepository } from '@axc/persistence';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;
export const DEFAULT_SORT = 'title';
export const INVALID_QUERY_PARAMETER = 'INVALID_QUERY_PARAMETER' as const;

export interface CourseSearchResult {
	items: readonly Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface CourseSearchErrorDetail {
	field: string;
	message: string;
}

export interface CourseSearchErrorBody {
	error: {
		code: typeof INVALID_QUERY_PARAMETER;
		message: string;
		details: CourseSearchErrorDetail[];
	};
}

export type CourseSearchOutcome = { kind: 'ok'; result: CourseSearchResult } | { kind: 'invalid'; error: CourseSearchErrorBody };

/** Raw query-string values, before validation. */
export interface CourseSearchQuery {
	q?: string;
	modality?: string;
	status?: string;
	tag?: string;
	page?: string;
	pageSize?: string;
	sort?: string;
}

export interface CourseServices {
	search(query: CourseSearchQuery): Promise<CourseSearchOutcome>;
}

type CriteriaOrErrors = { kind: 'ok'; criteria: CourseSearchCriteria } | { kind: 'invalid'; details: CourseSearchErrorDetail[] };

const asOneOf = <T extends string>(field: string, raw: string | undefined, allowed: readonly T[], details: CourseSearchErrorDetail[]): T | undefined => {
	if (raw === undefined) {
		return undefined;
	}
	if (!(allowed as readonly string[]).includes(raw)) {
		details.push({ field, message: `${field} must be one of ${allowed.join(', ')}.` });
		return undefined;
	}
	return raw as T;
};

const asText = (field: string, raw: string | undefined, details: CourseSearchErrorDetail[]): string | undefined => {
	if (raw === undefined) {
		return undefined;
	}
	const trimmed = raw.trim();
	if (trimmed === '') {
		details.push({ field, message: `${field} must not be empty.` });
		return undefined;
	}
	return trimmed;
};

const asPositiveInteger = (field: string, raw: string | undefined, fallback: number, max: number | undefined, details: CourseSearchErrorDetail[]): number => {
	if (raw === undefined) {
		return fallback;
	}
	const parsed = Number(raw);
	if (!Number.isInteger(parsed) || parsed < 1 || (max !== undefined && parsed > max)) {
		details.push({ field, message: max === undefined ? `${field} must be an integer of at least 1.` : `${field} must be between 1 and ${max}.` });
		return fallback;
	}
	return parsed;
};

/** Validates the raw query string into search criteria; unknown parameters are ignored. */
export function parseCourseSearchQuery(query: CourseSearchQuery): CriteriaOrErrors {
	const details: CourseSearchErrorDetail[] = [];
	const q = asText('q', query.q, details);
	const modality = asOneOf('modality', query.modality, COURSE_MODALITIES, details);
	const status = asOneOf('status', query.status, COURSE_STATUSES, details);
	const tag = asText('tag', query.tag, details);
	const criteria: CourseSearchCriteria = {
		page: asPositiveInteger('page', query.page, DEFAULT_PAGE, undefined, details),
		pageSize: asPositiveInteger('pageSize', query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, details),
		sort: asOneOf('sort', query.sort, COURSE_SORT_FIELDS, details) ?? DEFAULT_SORT,
		...(q !== undefined && { q }),
		...(modality !== undefined && { modality }),
		...(status !== undefined && { status }),
		...(tag !== undefined && { tag }),
	};
	return details.length > 0 ? { kind: 'invalid', details } : { kind: 'ok', criteria };
}

export function buildCourseServices(repository: CourseRepository): CourseServices {
	return {
		async search(query: CourseSearchQuery): Promise<CourseSearchOutcome> {
			const parsed = parseCourseSearchQuery(query);
			if (parsed.kind === 'invalid') {
				return { kind: 'invalid', error: { error: { code: INVALID_QUERY_PARAMETER, message: 'One or more query parameters are invalid.', details: parsed.details } } };
			}
			const { items, totalItems } = await repository.search(parsed.criteria);
			return {
				kind: 'ok',
				result: {
					items,
					page: parsed.criteria.page,
					pageSize: parsed.criteria.pageSize,
					totalItems,
					totalPages: Math.ceil(totalItems / parsed.criteria.pageSize),
				},
			};
		},
	};
}
