import { type Course, type CourseModality, type CourseStatus, isCourseModality, isCourseStatus } from '@axc/domain';
import { ApiError, type ApiFieldError } from './errors.ts';
import { type CourseSearchResult, toCourseSearchResult } from './mappers.ts';
import { pushDuplicate, type RawQuery, readQueryParam } from './query.ts';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;
const INVALID_QUERY_MESSAGE = 'One or more query parameters are invalid.';

type CourseSort = (typeof SORT_FIELDS)[number];

interface CourseFilters {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSort;
}

export function searchCourses(courses: readonly Course[], query: RawQuery): CourseSearchResult {
	const filters = parseCourseQuery(query);
	const matched = courses.filter((course) => matchesCourse(course, filters));
	const sorted = [...matched].sort((left, right) => compareCourses(left, right, filters.sort));
	const start = (filters.page - 1) * filters.pageSize;
	return toCourseSearchResult(sorted.slice(start, start + filters.pageSize), filters.page, filters.pageSize, sorted.length);
}

function parseCourseQuery(query: RawQuery): CourseFilters {
	const errors: ApiFieldError[] = [];
	const q = readTextFilter(query, 'q', errors);
	const tag = readTextFilter(query, 'tag', errors);
	const modality = readModality(query, errors);
	const status = readCourseStatus(query, errors);
	const page = readPage(query, errors);
	const pageSize = readPageSize(query, errors);
	const sort = readSort(query, errors);
	if (errors.length > 0 || page === undefined || pageSize === undefined || sort === undefined) {
		throw new ApiError(400, 'INVALID_QUERY_PARAMETER', INVALID_QUERY_MESSAGE, errors);
	}
	const filters: CourseFilters = { page, pageSize, sort };
	if (q !== undefined) {
		filters.q = q;
	}
	if (modality !== undefined) {
		filters.modality = modality;
	}
	if (status !== undefined) {
		filters.status = status;
	}
	if (tag !== undefined) {
		filters.tag = tag;
	}
	return filters;
}

function readTextFilter(query: RawQuery, field: string, errors: ApiFieldError[]): string | undefined {
	const param = readQueryParam(query, field);
	if (param.duplicate) {
		pushDuplicate(errors, field);
		return undefined;
	}
	if (param.value === undefined) {
		return undefined;
	}
	const trimmed = param.value.trim();
	if (trimmed === '') {
		return undefined;
	}
	return trimmed.toLowerCase();
}

function readModality(query: RawQuery, errors: ApiFieldError[]): CourseModality | undefined {
	const param = readQueryParam(query, 'modality');
	if (param.duplicate) {
		pushDuplicate(errors, 'modality');
		return undefined;
	}
	if (param.value === undefined) {
		return undefined;
	}
	const trimmed = param.value.trim();
	if (!isCourseModality(trimmed)) {
		errors.push({ field: 'modality', message: 'modality must be one of online, in-person, or hybrid.' });
		return undefined;
	}
	return trimmed;
}

function readCourseStatus(query: RawQuery, errors: ApiFieldError[]): CourseStatus | undefined {
	const param = readQueryParam(query, 'status');
	if (param.duplicate) {
		pushDuplicate(errors, 'status');
		return undefined;
	}
	if (param.value === undefined) {
		return undefined;
	}
	const trimmed = param.value.trim();
	if (!isCourseStatus(trimmed)) {
		errors.push({ field: 'status', message: 'status must be one of draft, active, or retired.' });
		return undefined;
	}
	return trimmed;
}

function readPage(query: RawQuery, errors: ApiFieldError[]): number | undefined {
	const param = readQueryParam(query, 'page');
	if (param.duplicate) {
		pushDuplicate(errors, 'page');
		return undefined;
	}
	if (param.value === undefined || param.value.trim() === '') {
		return DEFAULT_PAGE;
	}
	const page = parsePageNumber(param.value);
	if (page === undefined) {
		errors.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		return undefined;
	}
	return page;
}

function readPageSize(query: RawQuery, errors: ApiFieldError[]): number | undefined {
	const param = readQueryParam(query, 'pageSize');
	if (param.duplicate) {
		pushDuplicate(errors, 'pageSize');
		return undefined;
	}
	if (param.value === undefined || param.value.trim() === '') {
		return DEFAULT_PAGE_SIZE;
	}
	const pageSize = parsePageNumber(param.value);
	if (pageSize === undefined || pageSize > MAX_PAGE_SIZE) {
		errors.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		return undefined;
	}
	return pageSize;
}

function readSort(query: RawQuery, errors: ApiFieldError[]): CourseSort | undefined {
	const param = readQueryParam(query, 'sort');
	if (param.duplicate) {
		pushDuplicate(errors, 'sort');
		return undefined;
	}
	if (param.value === undefined || param.value.trim() === '') {
		return 'title';
	}
	const trimmed = param.value.trim();
	if (!isCourseSort(trimmed)) {
		errors.push({ field: 'sort', message: 'sort must be one of title, createdAt, or updatedAt.' });
		return undefined;
	}
	return trimmed;
}

function parsePageNumber(value: string): number | undefined {
	const trimmed = value.trim();
	if (!/^[1-9]\d*$/u.test(trimmed)) {
		return undefined;
	}
	const parsed = Number(trimmed);
	if (!Number.isSafeInteger(parsed)) {
		return undefined;
	}
	return parsed;
}

function isCourseSort(value: string): value is CourseSort {
	return (SORT_FIELDS as readonly string[]).includes(value);
}

function matchesCourse(course: Course, filters: CourseFilters): boolean {
	if (filters.modality !== undefined && course.modality !== filters.modality) {
		return false;
	}
	if (filters.status !== undefined && course.status !== filters.status) {
		return false;
	}
	if (filters.tag !== undefined && !course.tags.some((tag) => tag.toLowerCase() === filters.tag)) {
		return false;
	}
	if (filters.q !== undefined) {
		const needle = filters.q;
		const inTitle = course.title.toLowerCase().includes(needle);
		const inSummary = course.summary.toLowerCase().includes(needle);
		const inTags = course.tags.some((tag) => tag.toLowerCase().includes(needle));
		if (!inTitle && !inSummary && !inTags) {
			return false;
		}
	}
	return true;
}

function compareCourses(left: Course, right: Course, sort: CourseSort): number {
	const leftValue = left[sort];
	const rightValue = right[sort];
	if (leftValue < rightValue) {
		return -1;
	}
	if (leftValue > rightValue) {
		return 1;
	}
	if (left.id < right.id) {
		return -1;
	}
	if (left.id > right.id) {
		return 1;
	}
	return 0;
}
