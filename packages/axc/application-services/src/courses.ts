import { type Course, type CourseCatalog, type CourseModality, type CourseStatus, courseModalities, courseStatuses } from '@axc/domain';

const courseSortFields = ['title', 'createdAt', 'updatedAt'] as const;
type CourseSortField = (typeof courseSortFields)[number];

const defaultPage = 1;
const defaultPageSize = 10;
const maxPageSize = 50;
const invalidQueryMessage = 'One or more query parameters are invalid.';

export interface CourseSearchInput {
	q: string | undefined;
	modality: string | undefined;
	status: string | undefined;
	tag: string | undefined;
	page: string | undefined;
	pageSize: string | undefined;
	sort: string | undefined;
}

interface QueryParameterDetail {
	field: string;
	message: string;
}

interface InvalidQueryParameterError {
	code: 'INVALID_QUERY_PARAMETER';
	message: typeof invalidQueryMessage;
	details: QueryParameterDetail[];
}

interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface NormalizedCourseQuery {
	q: string | undefined;
	modality: CourseModality | undefined;
	status: CourseStatus | undefined;
	tag: string | undefined;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

export type CourseSearchResult = { ok: true; page: CoursePage } | { ok: false; error: InvalidQueryParameterError };

export async function searchCourses(catalog: CourseCatalog, input: CourseSearchInput): Promise<CourseSearchResult> {
	const parsed = parseCourseSearchInput(input);
	if (!parsed.ok) {
		return parsed;
	}

	const courses = await catalog.listCourses();
	const matched = courses.filter((course) => courseMatches(course, parsed.query));
	const sorted = [...matched].sort((left, right) => compareCourses(left, right, parsed.query.sort));
	const start = (parsed.query.page - 1) * parsed.query.pageSize;
	const items = sorted.slice(start, start + parsed.query.pageSize).map(copyCourse);
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / parsed.query.pageSize);

	return {
		ok: true,
		page: {
			items,
			page: parsed.query.page,
			pageSize: parsed.query.pageSize,
			totalItems,
			totalPages,
		},
	};
}

function parseCourseSearchInput(input: CourseSearchInput): { ok: true; query: NormalizedCourseQuery } | { ok: false; error: InvalidQueryParameterError } {
	const details: QueryParameterDetail[] = [];
	const modality = parseModality(input.modality, details);
	const status = parseStatus(input.status, details);
	const page = parsePage(input.page, details);
	const pageSize = parsePageSize(input.pageSize, details);
	const sort = parseSort(input.sort, details);
	if (details.length > 0) {
		return {
			ok: false,
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: invalidQueryMessage,
				details,
			},
		};
	}

	return {
		ok: true,
		query: {
			q: blankToUndefined(input.q),
			modality,
			status,
			tag: blankToUndefined(input.tag),
			page,
			pageSize,
			sort,
		},
	};
}

function parseModality(value: string | undefined, details: QueryParameterDetail[]): CourseModality | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (isListed(courseModalities, value)) {
		return value;
	}
	details.push({ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' });
	return undefined;
}

function parseStatus(value: string | undefined, details: QueryParameterDetail[]): CourseStatus | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (isListed(courseStatuses, value)) {
		return value;
	}
	details.push({ field: 'status', message: 'status must be one of draft, active, retired.' });
	return undefined;
}

function parsePage(value: string | undefined, details: QueryParameterDetail[]): number {
	if (value === undefined) {
		return defaultPage;
	}
	const parsed = readInteger(value);
	if (parsed === undefined) {
		details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		return defaultPage;
	}
	return parsed;
}

function parsePageSize(value: string | undefined, details: QueryParameterDetail[]): number {
	if (value === undefined) {
		return defaultPageSize;
	}
	const parsed = readInteger(value);
	if (parsed === undefined || parsed > maxPageSize) {
		details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		return defaultPageSize;
	}
	return parsed;
}

function parseSort(value: string | undefined, details: QueryParameterDetail[]): CourseSortField {
	if (value === undefined) {
		return 'title';
	}
	if (isListed(courseSortFields, value)) {
		return value;
	}
	details.push({ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' });
	return 'title';
}

function readInteger(value: string): number | undefined {
	if (!/^[1-9]\d*$/.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return undefined;
	}
	return parsed;
}

function blankToUndefined(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return undefined;
	}
	return trimmed;
}

function courseMatches(course: Course, query: NormalizedCourseQuery): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	const tag = query.tag;
	if (tag !== undefined && !course.tags.some((courseTag) => sameText(courseTag, tag))) {
		return false;
	}
	if (query.q !== undefined && !matchesKeyword(course, query.q)) {
		return false;
	}
	return true;
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLocaleLowerCase('en-US');
	const haystacks = [course.title, course.summary, ...course.tags];
	return haystacks.some((value) => value.toLocaleLowerCase('en-US').includes(needle));
}

function sameText(left: string, right: string): boolean {
	return left.toLocaleLowerCase('en-US') === right.toLocaleLowerCase('en-US');
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const primary = sort === 'title' ? left.title.localeCompare(right.title, 'en', { sensitivity: 'base' }) : sortValue(left, sort).localeCompare(sortValue(right, sort));
	if (primary !== 0) {
		return primary;
	}
	return left.id.localeCompare(right.id);
}

function sortValue(course: Course, sort: 'createdAt' | 'updatedAt'): string {
	return sort === 'createdAt' ? course.createdAt : course.updatedAt;
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

function isListed<T extends string>(values: readonly T[], value: string): value is T {
	return values.some((item) => item === value);
}
