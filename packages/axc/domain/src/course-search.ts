/** Course catalog search: criteria, query validation, and the pure search algorithm. */

import { COURSE_MODALITIES, COURSE_STATUSES, type Course, type CourseModality, type CourseStatus } from './course.ts';
import { type ErrorDetail, invalidQueryParameters } from './errors.ts';
import { type RawQuery, readQueryValue } from './raw-input.ts';

/** Fields a course search may be ordered by. */
export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

/** Field a course search is ordered by. */
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

/** Page returned when `page` is omitted. */
export const DEFAULT_COURSE_PAGE = 1;

/** Page size returned when `pageSize` is omitted. */
export const DEFAULT_COURSE_PAGE_SIZE = 10;

/** Largest page size the catalog will serve. */
export const MAX_COURSE_PAGE_SIZE = 50;

/** Sort applied when `sort` is omitted. */
export const DEFAULT_COURSE_SORT: CourseSortField = 'title';

/** Validated course search criteria. */
export interface CourseSearchCriteria {
	readonly q: string | undefined;
	readonly modality: CourseModality | undefined;
	readonly status: CourseStatus | undefined;
	readonly tag: string | undefined;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

/** Paginated course search result. */
export interface CourseSearchResult {
	readonly items: readonly Course[];
	readonly page: number;
	readonly pageSize: number;
	readonly totalItems: number;
	readonly totalPages: number;
}

/**
 * Validates a raw query string bag into course search criteria.
 *
 * @throws AxcDomainError `INVALID_QUERY_PARAMETER` listing every invalid parameter.
 */
export function validateCourseSearchQuery(query: RawQuery): CourseSearchCriteria {
	const details: ErrorDetail[] = [];

	const modality = readEnum(query, 'modality', COURSE_MODALITIES, details);
	const status = readEnum(query, 'status', COURSE_STATUSES, details);
	const sort = readEnum(query, 'sort', COURSE_SORT_FIELDS, details) ?? DEFAULT_COURSE_SORT;
	const page = readBoundedInteger(query, 'page', 1, Number.MAX_SAFE_INTEGER, details) ?? DEFAULT_COURSE_PAGE;
	const pageSize = readBoundedInteger(query, 'pageSize', 1, MAX_COURSE_PAGE_SIZE, details) ?? DEFAULT_COURSE_PAGE_SIZE;

	if (details.length > 0) {
		throw invalidQueryParameters(details);
	}

	return {
		q: readQueryValue(query, 'q'),
		modality,
		status,
		tag: readQueryValue(query, 'tag'),
		page,
		pageSize,
		sort,
	};
}

/** Filters, sorts, and paginates a course collection against validated criteria. */
export function searchCourseCollection(courses: readonly Course[], criteria: CourseSearchCriteria): CourseSearchResult {
	const matches = courses.filter((course) => matchesCriteria(course, criteria)).sort((left, right) => compareCourses(left, right, criteria.sort));
	const totalItems = matches.length;
	const offset = (criteria.page - 1) * criteria.pageSize;

	return {
		items: matches.slice(offset, offset + criteria.pageSize),
		page: criteria.page,
		pageSize: criteria.pageSize,
		totalItems,
		totalPages: Math.ceil(totalItems / criteria.pageSize),
	};
}

function matchesCriteria(course: Course, criteria: CourseSearchCriteria): boolean {
	if (criteria.modality !== undefined && course.modality !== criteria.modality) {
		return false;
	}
	if (criteria.status !== undefined && course.status !== criteria.status) {
		return false;
	}
	const tag = criteria.tag?.toLowerCase();
	if (tag !== undefined && !course.tags.some((candidate) => candidate.toLowerCase() === tag)) {
		return false;
	}
	if (criteria.q !== undefined && !matchesKeyword(course, criteria.q)) {
		return false;
	}
	return true;
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const ordered = sort === 'title' ? left.title.localeCompare(right.title) : left[sort].localeCompare(right[sort]);
	return ordered !== 0 ? ordered : left.id.localeCompare(right.id);
}

function readEnum<T extends string>(query: RawQuery, field: string, allowed: readonly T[], details: ErrorDetail[]): T | undefined {
	const value = readQueryValue(query, field);
	if (value === undefined) {
		return undefined;
	}
	if (!allowed.includes(value as T)) {
		details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
		return undefined;
	}
	return value as T;
}

function readBoundedInteger(query: RawQuery, field: string, min: number, max: number, details: ErrorDetail[]): number | undefined {
	const value = readQueryValue(query, field);
	if (value === undefined) {
		return undefined;
	}
	const parsed = Number(value);
	if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
		details.push({ field, message: max === Number.MAX_SAFE_INTEGER ? `${field} must be an integer greater than or equal to ${min}.` : `${field} must be between ${min} and ${max}.` });
		return undefined;
	}
	return parsed;
}
