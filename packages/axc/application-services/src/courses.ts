import { type Course, isCourseModality, isCourseStatus } from '@axc/domain';
import type { CourseReadRepository } from '@axc/persistence';

export const DEFAULT_COURSE_PAGE = 1;
export const DEFAULT_COURSE_PAGE_SIZE = 10;
export const MAX_COURSE_PAGE_SIZE = 50;
export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;
export const INVALID_QUERY_PARAMETER_CODE = 'INVALID_QUERY_PARAMETER' as const;
export const INVALID_QUERY_PARAMETER_MESSAGE = 'One or more query parameters are invalid.';

type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export interface CourseSearchInput {
	q?: string | undefined;
	modality?: string | undefined;
	status?: string | undefined;
	tag?: string | undefined;
	page?: string | undefined;
	pageSize?: string | undefined;
	sort?: string | undefined;
}

interface QueryParameterDetail {
	field: string;
	message: string;
}

export interface InvalidQueryError {
	code: typeof INVALID_QUERY_PARAMETER_CODE;
	message: typeof INVALID_QUERY_PARAMETER_MESSAGE;
	details: QueryParameterDetail[];
}

export interface CourseSearchPage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export type CourseSearchOutcome = { ok: true; value: CourseSearchPage } | { ok: false; error: InvalidQueryError };

export function searchCourses(catalog: CourseReadRepository, input: CourseSearchInput): CourseSearchOutcome {
	const parsed = parseCourseSearchInput(input);
	if (!parsed.ok) {
		return parsed;
	}

	const filtered = catalog.list().filter((course) => matchesCourse(course, parsed.value));
	const sorted = [...filtered].sort((left, right) => compareCourses(left, right, parsed.value.sort));
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / parsed.value.pageSize);
	const start = (parsed.value.page - 1) * parsed.value.pageSize;
	const items = sorted.slice(start, start + parsed.value.pageSize);

	return {
		ok: true,
		value: {
			items,
			page: parsed.value.page,
			pageSize: parsed.value.pageSize,
			totalItems,
			totalPages,
		},
	};
}

interface ParsedCourseSearch {
	q?: string | undefined;
	modality?: string | undefined;
	status?: string | undefined;
	tag?: string | undefined;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

function parseCourseSearchInput(input: CourseSearchInput): { ok: true; value: ParsedCourseSearch } | { ok: false; error: InvalidQueryError } {
	const details: QueryParameterDetail[] = [];

	if (input.modality !== undefined && !isCourseModality(input.modality)) {
		details.push({ field: 'modality', message: 'modality must be one of: online, in-person, hybrid.' });
	}

	if (input.status !== undefined && !isCourseStatus(input.status)) {
		details.push({ field: 'status', message: 'status must be one of: draft, active, retired.' });
	}

	const page = parseBoundedInteger(input.page, DEFAULT_COURSE_PAGE, 1, undefined, 'page', 'page must be an integer greater than or equal to 1.', details);
	const pageSize = parseBoundedInteger(input.pageSize, DEFAULT_COURSE_PAGE_SIZE, 1, MAX_COURSE_PAGE_SIZE, 'pageSize', 'pageSize must be between 1 and 50.', details);
	const sort = parseSort(input.sort, details);

	if (details.length > 0) {
		return {
			ok: false,
			error: {
				code: INVALID_QUERY_PARAMETER_CODE,
				message: INVALID_QUERY_PARAMETER_MESSAGE,
				details,
			},
		};
	}

	return {
		ok: true,
		value: {
			q: normalizeFilter(input.q),
			modality: input.modality,
			status: input.status,
			tag: normalizeFilter(input.tag),
			page,
			pageSize,
			sort,
		},
	};
}

function parseBoundedInteger(raw: string | undefined, defaultValue: number, min: number, max: number | undefined, field: string, message: string, details: QueryParameterDetail[]): number {
	if (raw === undefined) {
		return defaultValue;
	}

	if (!/^\d+$/.test(raw)) {
		details.push({ field, message });
		return defaultValue;
	}

	const value = Number(raw);
	if (value < min || (max !== undefined && value > max)) {
		details.push({ field, message });
		return defaultValue;
	}

	return value;
}

function parseSort(raw: string | undefined, details: QueryParameterDetail[]): CourseSortField {
	if (raw === undefined) {
		return 'title';
	}

	if ((COURSE_SORT_FIELDS as readonly string[]).includes(raw)) {
		return raw as CourseSortField;
	}

	details.push({ field: 'sort', message: 'sort must be one of: title, createdAt, updatedAt.' });
	return 'title';
}

function normalizeFilter(raw: string | undefined): string | undefined {
	if (raw === undefined) {
		return undefined;
	}

	const trimmed = raw.trim();
	return trimmed === '' ? undefined : trimmed;
}

function matchesCourse(course: Course, query: ParsedCourseSearch): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}

	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}

	if (query.tag !== undefined) {
		const requiredTag = query.tag;
		if (!course.tags.some((tag) => equalsIgnoreCase(tag, requiredTag))) {
			return false;
		}
	}

	if (query.q !== undefined) {
		const keyword = query.q;
		const haystacks = [course.title, course.summary, ...course.tags];
		if (!haystacks.some((value) => includesIgnoreCase(value, keyword))) {
			return false;
		}
	}

	return true;
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const primary = sort === 'title' ? left.title.localeCompare(right.title, 'en') : left[sort].localeCompare(right[sort]);
	if (primary !== 0) {
		return primary;
	}

	return left.id.localeCompare(right.id, 'en');
}

function includesIgnoreCase(haystack: string, needle: string): boolean {
	return haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
}

function equalsIgnoreCase(left: string, right: string): boolean {
	return left.toLocaleLowerCase() === right.toLocaleLowerCase();
}
