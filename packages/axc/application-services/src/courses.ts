import { COURSE_MODALITIES, COURSE_STATUSES, type Course, type CourseModality, type CourseStatus } from '@axc/domain';

const COURSE_SORTS = ['title', 'createdAt', 'updatedAt'] as const;
const SUPPORTED_QUERY_PARAMETERS = new Set<string>(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

type CourseSort = (typeof COURSE_SORTS)[number];

export interface CourseQueryInput {
	readonly [parameter: string]: readonly string[] | undefined;
}

interface CourseListItem {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface CoursePage {
	items: CourseListItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface QueryParameterDetail {
	field: string;
	message: string;
}

export interface InvalidCourseQuery {
	code: 'INVALID_QUERY_PARAMETER';
	message: 'One or more query parameters are invalid.';
	details: QueryParameterDetail[];
}

export type CourseSearchOutcome = { ok: true; page: CoursePage } | { ok: false; error: InvalidCourseQuery };

interface ParsedCourseQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSort;
}

interface ParsedFields {
	q: string | undefined;
	modality: CourseModality | undefined;
	status: CourseStatus | undefined;
	tag: string | undefined;
	page: number | undefined;
	pageSize: number | undefined;
	sort: CourseSort | undefined;
}

export function searchCourses(courses: readonly Course[], query: CourseQueryInput): CourseSearchOutcome {
	const details: QueryParameterDetail[] = [];
	const fields = readFields(query, details);
	appendUnknownParameters(query, details);
	if (details.length > 0) {
		return { ok: false, error: invalidQuery(details) };
	}
	return { ok: true, page: buildCoursePage(courses, requireParsedQuery(fields)) };
}

function readFields(query: CourseQueryInput, details: QueryParameterDetail[]): ParsedFields {
	return {
		q: readOptionalText(query, 'q', details),
		modality: readModality(query, details),
		status: readStatus(query, details),
		tag: readOptionalText(query, 'tag', details),
		page: readPage(query, details),
		pageSize: readPageSize(query, details),
		sort: readSort(query, details),
	};
}

function requireParsedQuery(fields: ParsedFields): ParsedCourseQuery {
	const page = fields.page ?? DEFAULT_PAGE;
	const pageSize = fields.pageSize ?? DEFAULT_PAGE_SIZE;
	const sort = fields.sort ?? 'title';
	const parsed: ParsedCourseQuery = { page, pageSize, sort };
	assignTextFilter(parsed, 'q', fields.q);
	if (fields.modality !== undefined) {
		parsed.modality = fields.modality;
	}
	if (fields.status !== undefined) {
		parsed.status = fields.status;
	}
	assignTextFilter(parsed, 'tag', fields.tag);
	return parsed;
}

function assignTextFilter(parsed: ParsedCourseQuery, field: 'q' | 'tag', value: string | undefined): void {
	if (value !== undefined && value !== '') {
		parsed[field] = value;
	}
}

function buildCoursePage(courses: readonly Course[], query: ParsedCourseQuery): CoursePage {
	const ordered = courses.filter((course) => matchesFilters(course, query)).sort((left, right) => compareCourses(left, right, query.sort));
	const start = (query.page - 1) * query.pageSize;
	const totalItems = ordered.length;
	return {
		items: ordered.slice(start, start + query.pageSize).map(toCourseListItem),
		page: query.page,
		pageSize: query.pageSize,
		totalItems,
		totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
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
	if (query.q !== undefined && !matchesKeyword(course, query.q)) {
		return false;
	}
	return true;
}

function hasTag(course: Course, expected: string): boolean {
	const needle = expected.toLocaleLowerCase('en-US');
	return course.tags.some((tag) => tag.toLocaleLowerCase('en-US') === needle);
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLocaleLowerCase('en-US');
	if (course.title.toLocaleLowerCase('en-US').includes(needle) || course.summary.toLocaleLowerCase('en-US').includes(needle)) {
		return true;
	}
	return course.tags.some((tag) => tag.toLocaleLowerCase('en-US').includes(needle));
}

function compareCourses(left: Course, right: Course, sort: CourseSort): number {
	const primary = left[sort].localeCompare(right[sort], 'en', { numeric: true, sensitivity: 'base' });
	if (primary !== 0) {
		return primary;
	}
	return left.id.localeCompare(right.id, 'en');
}

function toCourseListItem(course: Course): CourseListItem {
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

function readOptionalText(query: CourseQueryInput, field: 'q' | 'tag', details: QueryParameterDetail[]): string | undefined {
	return readSingle(query, field, details);
}

function readModality(query: CourseQueryInput, details: QueryParameterDetail[]): CourseModality | undefined {
	const value = readSingle(query, 'modality', details);
	if (value === undefined) {
		return undefined;
	}
	if (!isListed(COURSE_MODALITIES, value)) {
		details.push({ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' });
		return undefined;
	}
	return value;
}

function readStatus(query: CourseQueryInput, details: QueryParameterDetail[]): CourseStatus | undefined {
	const value = readSingle(query, 'status', details);
	if (value === undefined) {
		return undefined;
	}
	if (!isListed(COURSE_STATUSES, value)) {
		details.push({ field: 'status', message: 'status must be one of draft, active, retired.' });
		return undefined;
	}
	return value;
}

function readPage(query: CourseQueryInput, details: QueryParameterDetail[]): number | undefined {
	const value = readSingle(query, 'page', details);
	if (value === undefined) {
		return parameterPresent(query, 'page') ? undefined : DEFAULT_PAGE;
	}
	const parsed = parsePositiveInteger(value);
	if (parsed === undefined) {
		details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		return undefined;
	}
	return parsed;
}

function readPageSize(query: CourseQueryInput, details: QueryParameterDetail[]): number | undefined {
	const value = readSingle(query, 'pageSize', details);
	if (value === undefined) {
		return parameterPresent(query, 'pageSize') ? undefined : DEFAULT_PAGE_SIZE;
	}
	const parsed = parsePositiveInteger(value);
	if (parsed === undefined || parsed > MAX_PAGE_SIZE) {
		details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		return undefined;
	}
	return parsed;
}

function readSort(query: CourseQueryInput, details: QueryParameterDetail[]): CourseSort | undefined {
	const value = readSingle(query, 'sort', details);
	if (value === undefined) {
		return parameterPresent(query, 'sort') ? undefined : 'title';
	}
	if (!isListed(COURSE_SORTS, value)) {
		details.push({ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' });
		return undefined;
	}
	return value;
}

function readSingle(query: CourseQueryInput, field: string, details: QueryParameterDetail[]): string | undefined {
	const values = query[field];
	if (values === undefined) {
		return undefined;
	}
	const value = values[0];
	if (values.length !== 1 || value === undefined) {
		details.push({ field, message: `${field} must be provided once.` });
		return undefined;
	}
	return value;
}

function parameterPresent(query: CourseQueryInput, field: string): boolean {
	return query[field] !== undefined;
}

function appendUnknownParameters(query: CourseQueryInput, details: QueryParameterDetail[]): void {
	for (const field of Object.keys(query).sort()) {
		if (!SUPPORTED_QUERY_PARAMETERS.has(field)) {
			details.push({ field, message: `${field} is not a supported query parameter.` });
		}
	}
}

function parsePositiveInteger(value: string): number | undefined {
	if (!/^[1-9]\d*$/.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return undefined;
	}
	return parsed;
}

function isListed<T extends string>(allowed: readonly T[], value: string): value is T {
	return allowed.some((item) => item === value);
}

function invalidQuery(details: QueryParameterDetail[]): InvalidCourseQuery {
	return {
		code: 'INVALID_QUERY_PARAMETER',
		message: 'One or more query parameters are invalid.',
		details,
	};
}
