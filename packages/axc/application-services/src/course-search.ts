import { COURSE_MODALITIES, COURSE_SORT_FIELDS, COURSE_STATUSES, type Course, type CourseModality, type CourseSortField, type CourseStatus, isCourseModality, isCourseSortField, isCourseStatus } from '@axc/domain';

export const DEFAULT_COURSE_PAGE = 1;
export const DEFAULT_COURSE_PAGE_SIZE = 10;
const MAX_COURSE_PAGE_SIZE = 50;
const DEFAULT_COURSE_SORT: CourseSortField = 'title';

interface DataSources {
	courses: {
		list(): readonly Course[];
	};
}

export interface RawCourseQuery {
	q?: string;
	modality?: string;
	status?: string;
	tag?: string;
	page?: string;
	pageSize?: string;
	sort?: string;
}

interface CourseListQuery {
	readonly q?: string;
	readonly modality?: CourseModality;
	readonly status?: CourseStatus;
	readonly tag?: string;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

export interface CourseListResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface QueryParameterErrorDetail {
	field: string;
	message: string;
}

export class QueryValidationError extends Error {
	readonly code = 'INVALID_QUERY_PARAMETER' as const;
	readonly details: QueryParameterErrorDetail[];

	constructor(details: QueryParameterErrorDetail[]) {
		super('One or more query parameters are invalid.');
		this.name = 'QueryValidationError';
		this.details = details;
	}
}

export function createCourseSearch(dataSources: DataSources) {
	return (rawQuery: RawCourseQuery): CourseListResult => {
		const query = parseCourseListQuery(rawQuery);
		return searchCourses(dataSources.courses.list(), query);
	};
}

function parseCourseListQuery(rawQuery: RawCourseQuery): CourseListQuery {
	const details: QueryParameterErrorDetail[] = [];

	const q = optionalText(rawQuery.q);
	const tag = optionalText(rawQuery.tag);
	const modality = parseOptionalEnum(rawQuery.modality, 'modality', isCourseModality, `modality must be one of: ${COURSE_MODALITIES.join(', ')}.`, details);
	const status = parseOptionalEnum(rawQuery.status, 'status', isCourseStatus, `status must be one of: ${COURSE_STATUSES.join(', ')}.`, details);
	const sort = parseOptionalEnum(rawQuery.sort, 'sort', isCourseSortField, `sort must be one of: ${COURSE_SORT_FIELDS.join(', ')}.`, details) ?? DEFAULT_COURSE_SORT;
	const page = parsePositiveInteger(rawQuery.page, 'page', DEFAULT_COURSE_PAGE, Number.POSITIVE_INFINITY, details, 'page must be an integer greater than or equal to 1.');
	const pageSize = parsePositiveInteger(rawQuery.pageSize, 'pageSize', DEFAULT_COURSE_PAGE_SIZE, MAX_COURSE_PAGE_SIZE, details, 'pageSize must be between 1 and 50.');

	if (details.length > 0) {
		throw new QueryValidationError(details);
	}

	return {
		...(q === undefined ? {} : { q }),
		...(modality === undefined ? {} : { modality }),
		...(status === undefined ? {} : { status }),
		...(tag === undefined ? {} : { tag }),
		page,
		pageSize,
		sort,
	};
}

function searchCourses(courses: readonly Course[], query: CourseListQuery): CourseListResult {
	const filtered = courses.filter((course) => matchesFilters(course, query));
	const sorted = [...filtered].sort((left, right) => compareCourses(left, right, query.sort));
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
	const start = (query.page - 1) * query.pageSize;

	return {
		items: sorted.slice(start, start + query.pageSize),
		page: query.page,
		pageSize: query.pageSize,
		totalItems,
		totalPages,
	};
}

function matchesFilters(course: Course, query: CourseListQuery): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	if (query.tag !== undefined && !course.tags.some((courseTag) => courseTag.toLowerCase() === query.tag?.toLowerCase())) {
		return false;
	}
	if (query.q !== undefined && !matchesKeyword(course, query.q)) {
		return false;
	}
	return true;
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	if (course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle)) {
		return true;
	}
	return course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	if (sort === 'title') {
		const byTitle = left.title.localeCompare(right.title, 'en', { sensitivity: 'base' });
		if (byTitle !== 0) {
			return byTitle;
		}
	} else {
		const byField = left[sort].localeCompare(right[sort]);
		if (byField !== 0) {
			return byField;
		}
	}
	return left.id.localeCompare(right.id);
}

function optionalText(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

function parseOptionalEnum<T extends string>(value: string | undefined, field: string, isAllowed: (candidate: string) => candidate is T, message: string, details: QueryParameterErrorDetail[]): T | undefined {
	if (value === undefined || value.trim().length === 0) {
		return undefined;
	}
	if (!isAllowed(value)) {
		details.push({ field, message });
		return undefined;
	}
	return value;
}

function parsePositiveInteger(value: string | undefined, field: string, defaultValue: number, maximum: number, details: QueryParameterErrorDetail[], message: string): number {
	if (value === undefined || value.trim().length === 0) {
		return defaultValue;
	}
	if (!/^[1-9]\d*$/.test(value)) {
		details.push({ field, message });
		return defaultValue;
	}
	const parsed = Number(value);
	if (parsed > maximum) {
		details.push({ field, message });
		return defaultValue;
	}
	return parsed;
}
