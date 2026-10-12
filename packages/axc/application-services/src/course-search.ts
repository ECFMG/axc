import { type CourseModality, type CourseSearchCriteria, type CourseSortField, type CourseStatus, courseModalities, courseSortFields, courseStatuses } from '@axc/domain';
import { invalidQueryParameters, type ServiceErrorDetail } from './errors.ts';

export type RawQuery = Record<string, string | undefined>;

export const maxPageSize = 50;

/** Blank values are treated as absent so `?tag=` behaves like an omitted filter. */
export function optionalParam(query: RawQuery, name: string): string | undefined {
	const value = query[name];
	return value === undefined || value.trim() === '' ? undefined : value.trim();
}

export function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], field: string, details: ServiceErrorDetail[]): T | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (!(allowed as readonly string[]).includes(value)) {
		details.push({ field, message: `${field} must be one of ${allowed.join(', ')}.` });
		return undefined;
	}
	return value as T;
}

function positiveInteger(value: string | undefined, field: string, fallback: number, max: number, details: ServiceErrorDetail[]): number {
	if (value === undefined) {
		return fallback;
	}
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
		details.push({ field, message: `${field} must be between 1 and ${max}.` });
		return fallback;
	}
	return parsed;
}

/** Parses and validates the `GET /api/courses` query string. Throws `INVALID_QUERY_PARAMETER` on any bad value. */
export function parseCourseSearchCriteria(query: RawQuery): CourseSearchCriteria {
	const details: ServiceErrorDetail[] = [];
	const criteria: CourseSearchCriteria = {
		page: positiveInteger(optionalParam(query, 'page'), 'page', 1, Number.MAX_SAFE_INTEGER, details),
		pageSize: positiveInteger(optionalParam(query, 'pageSize'), 'pageSize', 10, maxPageSize, details),
		sort: oneOf<CourseSortField>(optionalParam(query, 'sort'), courseSortFields, 'sort', details) ?? 'title',
	};
	const q = optionalParam(query, 'q');
	const modality = oneOf<CourseModality>(optionalParam(query, 'modality'), courseModalities, 'modality', details);
	const status = oneOf<CourseStatus>(optionalParam(query, 'status'), courseStatuses, 'status', details);
	const tag = optionalParam(query, 'tag');
	if (details.length > 0) {
		throw invalidQueryParameters(details);
	}
	return {
		...criteria,
		...(q === undefined ? {} : { q }),
		...(modality === undefined ? {} : { modality }),
		...(status === undefined ? {} : { status }),
		...(tag === undefined ? {} : { tag }),
	};
}
