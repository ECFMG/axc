import {
	type Course,
	type CourseCatalog,
	type CourseModality,
	type CourseSortField,
	type CourseStatus,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	DEFAULT_COURSE_SORT,
	isCourseModality,
	isCourseSortField,
	isCourseStatus,
	MAX_COURSE_PAGE_SIZE,
} from '@axc/domain';

const INVALID_QUERY_CODE = 'INVALID_QUERY_PARAMETER' as const;
const INVALID_QUERY_MESSAGE = 'One or more query parameters are invalid.' as const;

const KNOWN_PARAMETERS = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'] as const;
type KnownParameter = (typeof KNOWN_PARAMETERS)[number];

const MODALITY_MESSAGE = 'modality must be one of online, in-person, hybrid.';
const STATUS_MESSAGE = 'status must be one of draft, active, retired.';
const PAGE_MESSAGE = 'page must be an integer greater than or equal to 1.';
const PAGE_SIZE_MESSAGE = 'pageSize must be between 1 and 50.';
const SORT_MESSAGE = 'sort must be one of title, createdAt, updatedAt.';
const UNKNOWN_PARAMETER_MESSAGE = 'Unknown query parameter.';

interface QueryParameterDetail {
	readonly field: string;
	readonly message: string;
}

export interface InvalidQueryError {
	readonly code: typeof INVALID_QUERY_CODE;
	readonly message: typeof INVALID_QUERY_MESSAGE;
	readonly details: readonly QueryParameterDetail[];
}

export interface CourseList {
	readonly items: readonly Course[];
	readonly page: number;
	readonly pageSize: number;
	readonly totalItems: number;
	readonly totalPages: number;
}

export type RawCourseQuery = Readonly<Record<string, readonly string[]>>;

export type ListCoursesResult = { readonly ok: true; readonly body: CourseList } | { readonly ok: false; readonly error: InvalidQueryError };

interface ParsedCourseQuery {
	readonly q?: string;
	readonly modality?: CourseModality;
	readonly status?: CourseStatus;
	readonly tag?: string;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

export function listCourses(catalog: CourseCatalog, query: RawCourseQuery): Promise<ListCoursesResult> {
	const details: QueryParameterDetail[] = [];
	const parsed = parseQuery(query, details);
	if (details.length > 0) {
		return Promise.resolve({
			ok: false,
			error: {
				code: INVALID_QUERY_CODE,
				message: INVALID_QUERY_MESSAGE,
				details,
			},
		});
	}
	return catalog.listAll().then((courses) => ({
		ok: true,
		body: pageCourses(courses, parsed),
	}));
}

function parseQuery(query: RawCourseQuery, details: QueryParameterDetail[]): ParsedCourseQuery {
	const q = parseOptionalText(readSingle(query, 'q', details));
	const modality = parseModality(readSingle(query, 'modality', details), details);
	const status = parseStatus(readSingle(query, 'status', details), details);
	const tag = parseOptionalText(readSingle(query, 'tag', details));
	const page = parsePage(readSingle(query, 'page', details), details);
	const pageSize = parsePageSize(readSingle(query, 'pageSize', details), details);
	const sort = parseSort(readSingle(query, 'sort', details), details);
	appendUnknownParameters(query, details);

	const parsed: {
		q?: string;
		modality?: CourseModality;
		status?: CourseStatus;
		tag?: string;
		page: number;
		pageSize: number;
		sort: CourseSortField;
	} = { page, pageSize, sort };
	if (q !== undefined) {
		parsed.q = q;
	}
	if (modality !== undefined) {
		parsed.modality = modality;
	}
	if (status !== undefined) {
		parsed.status = status;
	}
	if (tag !== undefined) {
		parsed.tag = tag;
	}
	return parsed;
}

function readSingle(query: RawCourseQuery, field: KnownParameter, details: QueryParameterDetail[]): string | undefined {
	const values = query[field];
	if (values === undefined) {
		return undefined;
	}
	const value = values.length === 1 ? values[0] : undefined;
	if (value === undefined) {
		details.push({ field, message: `${field} must be provided once.` });
		return undefined;
	}
	return value.trim();
}

function appendUnknownParameters(query: RawCourseQuery, details: QueryParameterDetail[]): void {
	const unknown = Object.keys(query)
		.filter((field) => !includesValue(KNOWN_PARAMETERS, field))
		.sort((left, right) => left.localeCompare(right));
	for (const field of unknown) {
		details.push({ field, message: UNKNOWN_PARAMETER_MESSAGE });
	}
}

function parseOptionalText(value: string | undefined): string | undefined {
	if (value === undefined || value === '') {
		return undefined;
	}
	return value;
}

function parseModality(value: string | undefined, details: QueryParameterDetail[]): CourseModality | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (value === '' || !isCourseModality(value)) {
		details.push({ field: 'modality', message: MODALITY_MESSAGE });
		return undefined;
	}
	return value;
}

function parseStatus(value: string | undefined, details: QueryParameterDetail[]): CourseStatus | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (value === '' || !isCourseStatus(value)) {
		details.push({ field: 'status', message: STATUS_MESSAGE });
		return undefined;
	}
	return value;
}

function parseSort(value: string | undefined, details: QueryParameterDetail[]): CourseSortField {
	if (value === undefined) {
		return DEFAULT_COURSE_SORT;
	}
	if (value === '' || !isCourseSortField(value)) {
		details.push({ field: 'sort', message: SORT_MESSAGE });
		return DEFAULT_COURSE_SORT;
	}
	return value;
}

function parsePage(value: string | undefined, details: QueryParameterDetail[]): number {
	if (value === undefined) {
		return DEFAULT_COURSE_PAGE;
	}
	const parsed = parseInteger(value, DEFAULT_COURSE_PAGE, Number.MAX_SAFE_INTEGER);
	if (parsed === undefined) {
		details.push({ field: 'page', message: PAGE_MESSAGE });
		return DEFAULT_COURSE_PAGE;
	}
	return parsed;
}

function parsePageSize(value: string | undefined, details: QueryParameterDetail[]): number {
	if (value === undefined) {
		return DEFAULT_COURSE_PAGE_SIZE;
	}
	const parsed = parseInteger(value, 1, MAX_COURSE_PAGE_SIZE);
	if (parsed === undefined) {
		details.push({ field: 'pageSize', message: PAGE_SIZE_MESSAGE });
		return DEFAULT_COURSE_PAGE_SIZE;
	}
	return parsed;
}

function parseInteger(value: string, minimum: number, maximum: number): number | undefined {
	if (!/^[1-9]\d*$/.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
		return undefined;
	}
	return parsed;
}

function pageCourses(courses: readonly Course[], query: ParsedCourseQuery): CourseList {
	const filtered = courses.filter((course) => matches(course, query));
	const sorted = [...filtered].sort((left, right) => compareCourses(query.sort, left, right));
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

function matches(course: Course, query: ParsedCourseQuery): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	if (query.tag !== undefined && !course.tags.some((tag) => sameText(tag, query.tag ?? ''))) {
		return false;
	}
	if (query.q !== undefined) {
		const needle = query.q;
		const found = [course.title, course.summary, ...course.tags].some((value) => value.toLocaleLowerCase('en').includes(needle.toLocaleLowerCase('en')));
		if (!found) {
			return false;
		}
	}
	return true;
}

function compareCourses(sort: CourseSortField, left: Course, right: Course): number {
	const primary = sort === 'title' ? left.title.localeCompare(right.title, 'en', { sensitivity: 'base' }) : left[sort].localeCompare(right[sort]);
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

function sameText(left: string, right: string): boolean {
	return left.toLocaleLowerCase('en') === right.toLocaleLowerCase('en');
}

function includesValue(values: readonly string[], value: string): boolean {
	return values.includes(value);
}
