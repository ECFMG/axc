import { type Course, type CourseCatalog, type CourseModality, type CourseSortField, type CourseStatus, courseModalities, courseSortFields, courseStatuses } from '@axc/domain';

const defaultPage = 1;
const defaultPageSize = 10;
const maxPageSize = 50;
const invalidQueryMessage = 'One or more query parameters are invalid.';

const allowedQueryParameters = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

export interface CourseListItem {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface CourseListPage {
	readonly items: readonly CourseListItem[];
	readonly page: number;
	readonly pageSize: number;
	readonly totalItems: number;
	readonly totalPages: number;
}

export interface CourseQueryErrorDetail {
	readonly field: string;
	readonly message: string;
}

export interface CourseQueryErrorBody {
	readonly error: {
		readonly code: 'INVALID_QUERY_PARAMETER';
		readonly message: typeof invalidQueryMessage;
		readonly details: readonly CourseQueryErrorDetail[];
	};
}

export type CourseQueryInput = { readonly [key: string]: string | readonly string[] | undefined };

export type SearchCoursesResult = { readonly ok: true; readonly body: CourseListPage } | { readonly ok: false; readonly body: CourseQueryErrorBody };

interface ParsedCourseQuery {
	readonly q?: string;
	readonly modality?: CourseModality;
	readonly status?: CourseStatus;
	readonly tag?: string;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

interface Detail {
	field: string;
	message: string;
}

type FieldRead = { readonly state: 'absent' } | { readonly state: 'invalid' } | { readonly state: 'present'; readonly value: string };

type ParseCourseQueryResult = { readonly ok: true; readonly query: ParsedCourseQuery } | { readonly ok: false; readonly body: CourseQueryErrorBody };

export async function searchCourses(courseCatalog: CourseCatalog, input: CourseQueryInput): Promise<SearchCoursesResult> {
	const parsed = parseCourseQuery(input);
	if (!parsed.ok) {
		return parsed;
	}

	const courses = await courseCatalog.listCourses();
	const matched = courses.filter((course) => matchesCourse(course, parsed.query)).sort((left, right) => compareCourses(parsed.query.sort, left, right));
	const totalItems = matched.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / parsed.query.pageSize);
	const start = (parsed.query.page - 1) * parsed.query.pageSize;

	return {
		ok: true,
		body: {
			items: matched.slice(start, start + parsed.query.pageSize).map(toCourseListItem),
			page: parsed.query.page,
			pageSize: parsed.query.pageSize,
			totalItems,
			totalPages,
		},
	};
}

function parseCourseQuery(input: CourseQueryInput): ParseCourseQueryResult {
	const details: Detail[] = [];
	const q = readOptionalText(input, 'q', details);
	const modality = readModality(input, details);
	const status = readStatus(input, details);
	const tag = readTag(input, details);
	const page = readPage(input, details);
	const pageSize = readPageSize(input, details);
	const sort = readSort(input, details);
	collectUnexpectedParameters(input, details);

	if (details.length > 0) {
		return {
			ok: false,
			body: {
				error: {
					code: 'INVALID_QUERY_PARAMETER',
					message: invalidQueryMessage,
					details,
				},
			},
		};
	}

	return {
		ok: true,
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

function readOptionalText(input: CourseQueryInput, field: string, details: Detail[]): string | undefined {
	const read = readSingle(input, field, details);
	if (read.state !== 'present') {
		return undefined;
	}
	const trimmed = read.value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

function readTag(input: CourseQueryInput, details: Detail[]): string | undefined {
	const read = readSingle(input, 'tag', details);
	if (read.state !== 'present') {
		return undefined;
	}
	const trimmed = read.value.trim();
	if (trimmed.length === 0) {
		details.push({ field: 'tag', message: 'tag must be a non-empty string.' });
		return undefined;
	}
	return trimmed;
}

function readModality(input: CourseQueryInput, details: Detail[]): CourseModality | undefined {
	const read = readSingle(input, 'modality', details);
	if (read.state !== 'present') {
		return undefined;
	}
	if (!isCourseModality(read.value)) {
		details.push({ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' });
		return undefined;
	}
	return read.value;
}

function readStatus(input: CourseQueryInput, details: Detail[]): CourseStatus | undefined {
	const read = readSingle(input, 'status', details);
	if (read.state !== 'present') {
		return undefined;
	}
	if (!isCourseStatus(read.value)) {
		details.push({ field: 'status', message: 'status must be one of draft, active, retired.' });
		return undefined;
	}
	return read.value;
}

function readPage(input: CourseQueryInput, details: Detail[]): number {
	const read = readSingle(input, 'page', details);
	if (read.state !== 'present') {
		return defaultPage;
	}
	const parsed = parseBoundedInteger(read.value, 1, Number.MAX_SAFE_INTEGER);
	if (parsed === undefined) {
		details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		return defaultPage;
	}
	return parsed;
}

function readPageSize(input: CourseQueryInput, details: Detail[]): number {
	const read = readSingle(input, 'pageSize', details);
	if (read.state !== 'present') {
		return defaultPageSize;
	}
	const parsed = parseBoundedInteger(read.value, 1, maxPageSize);
	if (parsed === undefined) {
		details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		return defaultPageSize;
	}
	return parsed;
}

function readSort(input: CourseQueryInput, details: Detail[]): CourseSortField {
	const read = readSingle(input, 'sort', details);
	if (read.state !== 'present') {
		return 'title';
	}
	if (!isCourseSortField(read.value)) {
		details.push({ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' });
		return 'title';
	}
	return read.value;
}

function collectUnexpectedParameters(input: CourseQueryInput, details: Detail[]): void {
	for (const key of Object.keys(input)) {
		if (allowedQueryParameters.has(key) || !hasQueryValue(input[key])) {
			continue;
		}
		details.push({ field: key, message: 'Unexpected query parameter.' });
	}
}

function readSingle(input: CourseQueryInput, field: string, details: Detail[]): FieldRead {
	const raw = input[field];
	if (!hasQueryValue(raw) || raw === undefined) {
		return { state: 'absent' };
	}
	const values = typeof raw === 'string' ? [raw] : [...raw];
	if (values.length > 1) {
		details.push({ field, message: `${field} must be provided once.` });
		return { state: 'invalid' };
	}
	const value = values[0];
	if (value === undefined) {
		return { state: 'absent' };
	}
	return { state: 'present', value };
}

function hasQueryValue(value: string | readonly string[] | undefined): boolean {
	if (value === undefined) {
		return false;
	}
	return typeof value === 'string' ? true : value.length > 0;
}

function parseBoundedInteger(value: string, min: number, max: number): number | undefined {
	if (!/^[1-9]\d*$/.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
		return undefined;
	}
	return parsed;
}

function isCourseModality(value: string): value is CourseModality {
	return courseModalities.some((modality) => modality === value);
}

function isCourseStatus(value: string): value is CourseStatus {
	return courseStatuses.some((status) => status === value);
}

function isCourseSortField(value: string): value is CourseSortField {
	return courseSortFields.some((sort) => sort === value);
}

function matchesCourse(course: Course, query: ParsedCourseQuery): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	const tag = query.tag;
	if (tag !== undefined && !course.tags.some((candidate) => candidate.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
		return false;
	}
	if (query.q !== undefined && !matchesKeyword(course, query.q)) {
		return false;
	}
	return true;
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLocaleLowerCase();
	return [course.title, course.summary, ...course.tags].some((field) => field.toLocaleLowerCase().includes(needle));
}

function compareCourses(sort: CourseSortField, left: Course, right: Course): number {
	const byField = readSortValue(left, sort).localeCompare(readSortValue(right, sort), 'en', { numeric: true, sensitivity: 'base' });
	if (byField !== 0) {
		return byField;
	}
	return left.id.localeCompare(right.id, 'en');
}

function readSortValue(course: Course, sort: CourseSortField): string {
	if (sort === 'title') {
		return course.title;
	}
	if (sort === 'createdAt') {
		return course.createdAt;
	}
	return course.updatedAt;
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
