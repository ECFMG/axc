import { type Course, type CourseCatalog, type CourseModality, type CourseStatus, courseModalities, courseStatuses } from '@axc/domain';

const courseSortFields = ['title', 'createdAt', 'updatedAt'] as const;
type CourseSortField = (typeof courseSortFields)[number];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const INVALID_QUERY_CODE = 'INVALID_QUERY_PARAMETER' as const;
const INVALID_QUERY_MESSAGE = 'One or more query parameters are invalid.' as const;

export interface CourseSearchQuery {
	readonly q: readonly string[] | undefined;
	readonly modality: readonly string[] | undefined;
	readonly status: readonly string[] | undefined;
	readonly tag: readonly string[] | undefined;
	readonly page: readonly string[] | undefined;
	readonly pageSize: readonly string[] | undefined;
	readonly sort: readonly string[] | undefined;
}

export interface CourseQueryDetail {
	readonly field: string;
	readonly message: string;
}

export interface CourseQueryError {
	readonly error: {
		readonly code: typeof INVALID_QUERY_CODE;
		readonly message: typeof INVALID_QUERY_MESSAGE;
		readonly details: readonly CourseQueryDetail[];
	};
}

export interface CoursePage {
	readonly items: readonly Course[];
	readonly page: number;
	readonly pageSize: number;
	readonly totalItems: number;
	readonly totalPages: number;
}

export type CourseSearchResult = { readonly ok: true; readonly body: CoursePage } | { readonly ok: false; readonly error: CourseQueryError };

interface ParsedCourseQuery {
	readonly keyword: string | undefined;
	readonly modality: CourseModality | undefined;
	readonly status: CourseStatus | undefined;
	readonly tag: string | undefined;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

type ValidatedCourseQuery = { readonly ok: true; readonly query: ParsedCourseQuery } | { readonly ok: false; readonly error: CourseQueryError };

export function createCourseSearcher(catalog: CourseCatalog): { search(query: CourseSearchQuery): Promise<CourseSearchResult> } {
	return {
		async search(query) {
			const validated = validateCourseQuery(query);
			if (!validated.ok) {
				return validated;
			}
			const courses = await catalog.listCourses();
			return { ok: true, body: buildCoursePage(courses, validated.query) };
		},
	};
}

function validateCourseQuery(query: CourseSearchQuery): ValidatedCourseQuery {
	const details: CourseQueryDetail[] = [];
	const keyword = readKeyword(query.q, details);
	const modality = readModality(query.modality, details);
	const status = readStatus(query.status, details);
	const tag = readTag(query.tag, details);
	const page = readPage(query.page, details);
	const pageSize = readPageSize(query.pageSize, details);
	const sort = readSort(query.sort, details);
	if (details.length > 0) {
		return { ok: false, error: invalidQuery(details) };
	}
	return { ok: true, query: { keyword, modality, status, tag, page, pageSize, sort } };
}

function readKeyword(values: readonly string[] | undefined, details: CourseQueryDetail[]): string | undefined {
	const raw = readRaw('q', values, details);
	if (raw === undefined || raw === '') {
		return undefined;
	}
	return raw;
}

function readModality(values: readonly string[] | undefined, details: CourseQueryDetail[]): CourseModality | undefined {
	const raw = readRaw('modality', values, details);
	if (raw === undefined) {
		return undefined;
	}
	if (!isOneOf(courseModalities, raw)) {
		details.push({ field: 'modality', message: `modality must be ${listValues(courseModalities)}.` });
		return undefined;
	}
	return raw;
}

function readStatus(values: readonly string[] | undefined, details: CourseQueryDetail[]): CourseStatus | undefined {
	const raw = readRaw('status', values, details);
	if (raw === undefined) {
		return undefined;
	}
	if (!isOneOf(courseStatuses, raw)) {
		details.push({ field: 'status', message: `status must be ${listValues(courseStatuses)}.` });
		return undefined;
	}
	return raw;
}

function readTag(values: readonly string[] | undefined, details: CourseQueryDetail[]): string | undefined {
	const raw = readRaw('tag', values, details);
	if (raw === undefined) {
		return undefined;
	}
	if (raw === '') {
		details.push({ field: 'tag', message: 'tag must be a non-empty string.' });
		return undefined;
	}
	return raw;
}

function readPage(values: readonly string[] | undefined, details: CourseQueryDetail[]): number {
	const raw = readRaw('page', values, details);
	if (raw === undefined) {
		return DEFAULT_PAGE;
	}
	const parsed = parseIntegerInRange(raw, 1, Number.MAX_SAFE_INTEGER);
	if (parsed === undefined) {
		details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		return DEFAULT_PAGE;
	}
	return parsed;
}

function readPageSize(values: readonly string[] | undefined, details: CourseQueryDetail[]): number {
	const raw = readRaw('pageSize', values, details);
	if (raw === undefined) {
		return DEFAULT_PAGE_SIZE;
	}
	const parsed = parseIntegerInRange(raw, 1, MAX_PAGE_SIZE);
	if (parsed === undefined) {
		details.push({ field: 'pageSize', message: `pageSize must be between 1 and ${MAX_PAGE_SIZE}.` });
		return DEFAULT_PAGE_SIZE;
	}
	return parsed;
}

function readSort(values: readonly string[] | undefined, details: CourseQueryDetail[]): CourseSortField {
	const raw = readRaw('sort', values, details);
	if (raw === undefined) {
		return 'title';
	}
	if (!isOneOf(courseSortFields, raw)) {
		details.push({ field: 'sort', message: `sort must be ${listValues(courseSortFields)}.` });
		return 'title';
	}
	return raw;
}

function readRaw(field: string, values: readonly string[] | undefined, details: CourseQueryDetail[]): string | undefined {
	if (values === undefined) {
		return undefined;
	}
	if (values.length !== 1) {
		details.push({ field, message: `${field} must be provided once.` });
		return undefined;
	}
	return values[0];
}

function parseIntegerInRange(raw: string, min: number, max: number): number | undefined {
	if (!/^[1-9]\d*$/.test(raw)) {
		return undefined;
	}
	const value = Number(raw);
	if (!Number.isSafeInteger(value) || value < min || value > max) {
		return undefined;
	}
	return value;
}

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
	return values.some((candidate) => candidate === value);
}

function listValues(values: readonly string[]): string {
	const last = values[values.length - 1];
	if (last === undefined) {
		return '';
	}
	if (values.length === 1) {
		return last;
	}
	return `${values.slice(0, -1).join(', ')}, or ${last}`;
}

function invalidQuery(details: readonly CourseQueryDetail[]): CourseQueryError {
	return {
		error: {
			code: INVALID_QUERY_CODE,
			message: INVALID_QUERY_MESSAGE,
			details,
		},
	};
}

function buildCoursePage(courses: readonly Course[], query: ParsedCourseQuery): CoursePage {
	const sorted = courses.filter((course) => matchesFilters(course, query)).sort((left, right) => compareCourses(query.sort, left, right));
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
	const start = (query.page - 1) * query.pageSize;
	return {
		items: sorted.slice(start, start + query.pageSize).map(copyCourse),
		page: query.page,
		pageSize: query.pageSize,
		totalItems,
		totalPages,
	};
}

function matchesFilters(course: Course, query: ParsedCourseQuery): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	if (query.tag !== undefined && !hasTag(course, query.tag)) {
		return false;
	}
	if (query.keyword !== undefined && !containsKeyword(course, query.keyword)) {
		return false;
	}
	return true;
}

function containsKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLocaleLowerCase('en-US');
	if (course.title.toLocaleLowerCase('en-US').includes(needle)) {
		return true;
	}
	if (course.summary.toLocaleLowerCase('en-US').includes(needle)) {
		return true;
	}
	return course.tags.some((tag) => tag.toLocaleLowerCase('en-US').includes(needle));
}

function hasTag(course: Course, tag: string): boolean {
	const needle = tag.toLocaleLowerCase('en-US');
	return course.tags.some((courseTag) => courseTag.toLocaleLowerCase('en-US') === needle);
}

function compareCourses(sort: CourseSortField, left: Course, right: Course): number {
	const primary = sort === 'title' ? left.title.localeCompare(right.title, 'en-US', { sensitivity: 'base' }) : left[sort].localeCompare(right[sort]);
	if (primary !== 0) {
		return primary;
	}
	return left.id.localeCompare(right.id);
}

function copyCourse(course: Course): Course {
	return {
		id: course.id,
		title: course.title,
		summary: course.summary,
		modality: course.modality,
		status: course.status,
		tags: [...course.tags],
		createdAt: course.createdAt,
		updatedAt: course.updatedAt,
	};
}
