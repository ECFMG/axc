import { COURSE_MODALITIES, COURSE_STATUSES, type Course, type CourseModality, type CourseStatus } from '@axc/domain';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;
const KNOWN_QUERY_PARAMETERS = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'] as const;

type CourseSortField = (typeof SORT_FIELDS)[number];
type KnownQueryParameter = (typeof KNOWN_QUERY_PARAMETERS)[number];

export interface CourseQueryErrorDetail {
	field: string;
	message: string;
}

export interface CourseQueryErrorBody {
	code: 'INVALID_QUERY_PARAMETER';
	message: 'One or more query parameters are invalid.';
	details: CourseQueryErrorDetail[];
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export type CourseSearchResult = { readonly kind: 'ok'; readonly page: CoursePage } | { readonly kind: 'invalid'; readonly error: CourseQueryErrorBody };

interface CourseQuery {
	readonly q?: string;
	readonly modality?: CourseModality;
	readonly status?: CourseStatus;
	readonly tag?: string;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

const KNOWN_QUERY_PARAMETER_SET = new Set<string>(KNOWN_QUERY_PARAMETERS);

export function searchCourses(courses: readonly Course[], rawQuery: Readonly<Record<string, readonly string[]>>): CourseSearchResult {
	const parsed = parseCourseQuery(rawQuery);
	if (parsed.kind === 'invalid') {
		return parsed;
	}
	return { kind: 'ok', page: pageCourses(courses, parsed.query) };
}

function parseCourseQuery(rawQuery: Readonly<Record<string, readonly string[]>>): { readonly kind: 'ok'; readonly query: CourseQuery } | { readonly kind: 'invalid'; readonly error: CourseQueryErrorBody } {
	const details: CourseQueryErrorDetail[] = [];
	for (const field of Object.keys(rawQuery).sort()) {
		if (!KNOWN_QUERY_PARAMETER_SET.has(field)) {
			details.push({ field, message: 'Unknown query parameter.' });
		}
	}

	const q = optionalText(readParameter(rawQuery, 'q', details));
	const modality = parseModality(readParameter(rawQuery, 'modality', details), details);
	const status = parseStatus(readParameter(rawQuery, 'status', details), details);
	const tag = readParameter(rawQuery, 'tag', details);
	const page = parsePage(readParameter(rawQuery, 'page', details), details);
	const pageSize = parsePageSize(readParameter(rawQuery, 'pageSize', details), details);
	const sort = parseSort(readParameter(rawQuery, 'sort', details), details);

	if (details.length > 0 || page === undefined || pageSize === undefined || sort === undefined) {
		return { kind: 'invalid', error: invalidQuery(details) };
	}

	return {
		kind: 'ok',
		query: {
			page,
			pageSize,
			sort,
			...(q === undefined ? {} : { q }),
			...(modality === undefined ? {} : { modality }),
			...(status === undefined ? {} : { status }),
			...(tag === undefined ? {} : { tag }),
		},
	};
}

function readParameter(rawQuery: Readonly<Record<string, readonly string[]>>, field: KnownQueryParameter, details: CourseQueryErrorDetail[]): string | undefined {
	const values = rawQuery[field];
	if (values === undefined || values.length === 0) {
		return undefined;
	}
	const value = values[0];
	if (values.length > 1 || value === undefined) {
		details.push({ field, message: `${field} must be provided once.` });
		return undefined;
	}
	return value;
}

function optionalText(value: string | undefined): string | undefined {
	if (value === undefined || value.length === 0) {
		return undefined;
	}
	return value;
}

function parseModality(value: string | undefined, details: CourseQueryErrorDetail[]): CourseModality | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (isOneOf(COURSE_MODALITIES, value)) {
		return value;
	}
	details.push({ field: 'modality', message: `modality must be one of ${COURSE_MODALITIES.join(', ')}.` });
	return undefined;
}

function parseStatus(value: string | undefined, details: CourseQueryErrorDetail[]): CourseStatus | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (isOneOf(COURSE_STATUSES, value)) {
		return value;
	}
	details.push({ field: 'status', message: `status must be one of ${COURSE_STATUSES.join(', ')}.` });
	return undefined;
}

function parseSort(value: string | undefined, details: CourseQueryErrorDetail[]): CourseSortField | undefined {
	if (value === undefined) {
		return 'title';
	}
	if (isOneOf(SORT_FIELDS, value)) {
		return value;
	}
	details.push({ field: 'sort', message: `sort must be one of ${SORT_FIELDS.join(', ')}.` });
	return undefined;
}

function parsePage(value: string | undefined, details: CourseQueryErrorDetail[]): number | undefined {
	if (value === undefined) {
		return DEFAULT_PAGE;
	}
	const parsed = parseBoundedInteger(value, 1, undefined);
	if (parsed === undefined) {
		details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		return undefined;
	}
	return parsed;
}

function parsePageSize(value: string | undefined, details: CourseQueryErrorDetail[]): number | undefined {
	if (value === undefined) {
		return DEFAULT_PAGE_SIZE;
	}
	const parsed = parseBoundedInteger(value, 1, MAX_PAGE_SIZE);
	if (parsed === undefined) {
		details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		return undefined;
	}
	return parsed;
}

function parseBoundedInteger(value: string, minimum: number, maximum: number | undefined): number | undefined {
	if (!/^[1-9][0-9]*$/.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed < minimum || (maximum !== undefined && parsed > maximum)) {
		return undefined;
	}
	return parsed;
}

function isOneOf<T extends string>(allowed: readonly T[], value: string): value is T {
	return allowed.some((item) => item === value);
}

function invalidQuery(details: CourseQueryErrorDetail[]): CourseQueryErrorBody {
	return {
		code: 'INVALID_QUERY_PARAMETER',
		message: 'One or more query parameters are invalid.',
		details,
	};
}

function pageCourses(courses: readonly Course[], query: CourseQuery): CoursePage {
	const matched = courses.filter((course) => matchesCourse(course, query));
	const sorted = [...matched].sort((left, right) => compareCourses(left, right, query.sort));
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

function matchesCourse(course: Course, query: CourseQuery): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	if (query.tag !== undefined && !course.tags.some((tag) => tag.toLowerCase() === query.tag?.toLowerCase())) {
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
	const compared = left[sort].localeCompare(right[sort], 'en', { numeric: true, sensitivity: 'base' });
	if (compared !== 0) {
		return compared;
	}
	return left.id.localeCompare(right.id, 'en');
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
