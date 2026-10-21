import { COURSE_MODALITIES, COURSE_SORT_FIELDS, COURSE_STATUSES, type Course, type CourseCatalog, type CourseModality, type CourseSortField, type CourseStatus } from '@axc/domain';

const INVALID_QUERY_CODE = 'INVALID_QUERY_PARAMETER' as const;
const INVALID_QUERY_MESSAGE = 'One or more query parameters are invalid.';
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const DEFAULT_SORT: CourseSortField = 'title';

export interface CourseSearchInput {
	q?: string;
	modality?: string;
	status?: string;
	tag?: string;
	page?: string;
	pageSize?: string;
	sort?: string;
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface CourseQueryErrorDetail {
	field: string;
	message: string;
}

export interface CourseQueryErrorBody {
	error: {
		code: typeof INVALID_QUERY_CODE;
		message: typeof INVALID_QUERY_MESSAGE;
		details: CourseQueryErrorDetail[];
	};
}

export type CourseSearchOutcome = { ok: true; page: CoursePage } | { ok: false; error: CourseQueryErrorBody };

interface CourseQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

export function searchCourses(catalog: CourseCatalog, input: CourseSearchInput): CourseSearchOutcome {
	const normalized = normalizeQuery(input);
	if (!normalized.ok) {
		return {
			ok: false,
			error: {
				error: {
					code: INVALID_QUERY_CODE,
					message: INVALID_QUERY_MESSAGE,
					details: normalized.details,
				},
			},
		};
	}

	const query = normalized.query;
	const matched = catalog.list().filter((course) => matchesCourse(course, query));
	const sorted = matched.toSorted((left, right) => compareCourses(left, right, query.sort));
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
	const start = (query.page - 1) * query.pageSize;

	return {
		ok: true,
		page: {
			items: sorted.slice(start, start + query.pageSize).map((course) => cloneCourse(course)),
			page: query.page,
			pageSize: query.pageSize,
			totalItems,
			totalPages,
		},
	};
}

function normalizeQuery(input: CourseSearchInput): { ok: true; query: CourseQuery } | { ok: false; details: CourseQueryErrorDetail[] } {
	const details: CourseQueryErrorDetail[] = [];
	const modality = readModality(input.modality, details);
	const status = readStatus(input.status, details);
	const page = readPage(input.page, details);
	const pageSize = readPageSize(input.pageSize, details);
	const sort = readSort(input.sort, details);
	if (details.length > 0) {
		return { ok: false, details };
	}

	const query: CourseQuery = { page, pageSize, sort };
	const keyword = optionalText(input.q);
	if (keyword !== undefined) {
		query.q = keyword;
	}
	if (modality !== undefined) {
		query.modality = modality;
	}
	if (status !== undefined) {
		query.status = status;
	}
	const tag = optionalText(input.tag);
	if (tag !== undefined) {
		query.tag = tag;
	}
	return { ok: true, query };
}

function readModality(value: string | undefined, details: CourseQueryErrorDetail[]): CourseModality | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (isOneOf(COURSE_MODALITIES, value)) {
		return value;
	}
	details.push({ field: 'modality', message: 'modality must be online, in-person, or hybrid.' });
	return undefined;
}

function readStatus(value: string | undefined, details: CourseQueryErrorDetail[]): CourseStatus | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (isOneOf(COURSE_STATUSES, value)) {
		return value;
	}
	details.push({ field: 'status', message: 'status must be draft, active, or retired.' });
	return undefined;
}

function readPage(value: string | undefined, details: CourseQueryErrorDetail[]): number {
	if (value === undefined) {
		return DEFAULT_PAGE;
	}
	const parsed = parseInteger(value);
	if (parsed === undefined) {
		details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		return DEFAULT_PAGE;
	}
	return parsed;
}

function readPageSize(value: string | undefined, details: CourseQueryErrorDetail[]): number {
	if (value === undefined) {
		return DEFAULT_PAGE_SIZE;
	}
	const parsed = parseInteger(value);
	if (parsed === undefined || parsed > MAX_PAGE_SIZE) {
		details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		return DEFAULT_PAGE_SIZE;
	}
	return parsed;
}

function readSort(value: string | undefined, details: CourseQueryErrorDetail[]): CourseSortField {
	if (value === undefined) {
		return DEFAULT_SORT;
	}
	if (isOneOf(COURSE_SORT_FIELDS, value)) {
		return value;
	}
	details.push({ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' });
	return DEFAULT_SORT;
}

function matchesCourse(course: Course, query: CourseQuery): boolean {
	if (query.q !== undefined && !matchesKeyword(course, query.q)) {
		return false;
	}
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	if (query.tag !== undefined && !hasTag(course, query.tag)) {
		return false;
	}
	return true;
}

function matchesKeyword(course: Course, keyword: string): boolean {
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
	const expected = tag.toLocaleLowerCase('en-US');
	return course.tags.some((item) => item.toLocaleLowerCase('en-US') === expected);
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const primary = compareText(left[sort], right[sort]);
	if (primary !== 0) {
		return primary;
	}
	return compareText(left.id, right.id);
}

function compareText(left: string, right: string): number {
	return left.localeCompare(right, 'en', { sensitivity: 'base' });
}

function optionalText(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return undefined;
	}
	return trimmed;
}

function parseInteger(value: string): number | undefined {
	if (!/^[1-9]\d*$/.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return undefined;
	}
	return parsed;
}

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
	return values.some((item) => item === value);
}

function cloneCourse(course: Course): Course {
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
