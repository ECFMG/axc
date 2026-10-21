import { type Course, type CourseModality, type CourseStatus, courseModalities, courseStatuses } from '@axc/domain';
import { type FieldDetail, type QueryValues, readSingleQueryValue, readUnknownQueryParameters } from './query-values.ts';

const courseSortFields = ['title', 'createdAt', 'updatedAt'] as const;
type CourseSortField = (typeof courseSortFields)[number];

const INVALID_QUERY_CODE = 'INVALID_QUERY_PARAMETER' as const;
const INVALID_QUERY_MESSAGE = 'One or more query parameters are invalid.' as const;
const supportedParameters = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'] as const;
const defaultPage = 1;
const defaultPageSize = 10;
const maxPageSize = 50;

export interface CourseQueryErrorDetail {
	field: string;
	message: string;
}

export interface CourseQueryError {
	code: typeof INVALID_QUERY_CODE;
	message: typeof INVALID_QUERY_MESSAGE;
	details: CourseQueryErrorDetail[];
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export type CourseListResult = { ok: true; page: CoursePage } | { ok: false; error: CourseQueryError };

/** Raw query string values. Each key maps to every value sent for that parameter. */
export type CourseQueryInput = QueryValues;

interface ParsedCourseQuery {
	keyword: string | undefined;
	modality: CourseModality | undefined;
	status: CourseStatus | undefined;
	tag: string | undefined;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

export function listCourses(courses: readonly Course[], query: CourseQueryInput): CourseListResult {
	const parsed = parseCourseQuery(query);
	if (!parsed.ok) {
		return parsed;
	}
	const { keyword, modality, status, tag, page, pageSize, sort } = parsed.value;
	const ordered = courses.filter((course) => matchesCourse(course, keyword, modality, status, tag)).sort(compareCourses(sort));
	const totalItems = ordered.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
	const start = (page - 1) * pageSize;
	return {
		ok: true,
		page: {
			items: ordered.slice(start, start + pageSize).map((course) => copyCourse(course)),
			page,
			pageSize,
			totalItems,
			totalPages,
		},
	};
}

function parseCourseQuery(query: QueryValues): { ok: true; value: ParsedCourseQuery } | { ok: false; error: CourseQueryError } {
	const details: FieldDetail[] = [];
	const keyword = readKeyword(readSingleQueryValue(query, 'q', details));
	const modality = readModality(readSingleQueryValue(query, 'modality', details), details);
	const status = readStatus(readSingleQueryValue(query, 'status', details), details);
	const tag = readTag(readSingleQueryValue(query, 'tag', details), details);
	const page = readPage(readSingleQueryValue(query, 'page', details), details);
	const pageSize = readPageSize(readSingleQueryValue(query, 'pageSize', details), details);
	const sort = readSort(readSingleQueryValue(query, 'sort', details), details);
	readUnknownQueryParameters(query, supportedParameters, details);
	if (details.length > 0) {
		return {
			ok: false,
			error: {
				code: INVALID_QUERY_CODE,
				message: INVALID_QUERY_MESSAGE,
				details,
			},
		};
	}
	return {
		ok: true,
		value: { keyword, modality, status, tag, page, pageSize, sort },
	};
}

function readKeyword(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

function readModality(value: string | undefined, details: FieldDetail[]): CourseModality | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (!isAllowed(value, courseModalities)) {
		details.push({ field: 'modality', message: `modality must be one of ${formatChoices(courseModalities)}.` });
		return undefined;
	}
	return value;
}

function readStatus(value: string | undefined, details: FieldDetail[]): CourseStatus | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (!isAllowed(value, courseStatuses)) {
		details.push({ field: 'status', message: `status must be one of ${formatChoices(courseStatuses)}.` });
		return undefined;
	}
	return value;
}

function readTag(value: string | undefined, details: FieldDetail[]): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		details.push({ field: 'tag', message: 'tag must be a non-empty string.' });
		return undefined;
	}
	return trimmed;
}

function readPage(value: string | undefined, details: FieldDetail[]): number {
	if (value === undefined) {
		return defaultPage;
	}
	const parsed = readPositiveInteger(value);
	if (parsed === undefined) {
		details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		return defaultPage;
	}
	return parsed;
}

function readPageSize(value: string | undefined, details: FieldDetail[]): number {
	if (value === undefined) {
		return defaultPageSize;
	}
	const parsed = readPositiveInteger(value);
	if (parsed === undefined || parsed > maxPageSize) {
		details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		return defaultPageSize;
	}
	return parsed;
}

function readSort(value: string | undefined, details: FieldDetail[]): CourseSortField {
	if (value === undefined) {
		return 'title';
	}
	if (!isAllowed(value, courseSortFields)) {
		details.push({ field: 'sort', message: `sort must be one of ${formatChoices(courseSortFields)}.` });
		return 'title';
	}
	return value;
}

function readPositiveInteger(value: string): number | undefined {
	if (!/^[1-9]\d*$/.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function isAllowed<T extends string>(value: string, allowed: readonly T[]): value is T {
	return allowed.some((item) => item === value);
}

function matchesCourse(course: Course, keyword: string | undefined, modality: CourseModality | undefined, status: CourseStatus | undefined, tag: string | undefined): boolean {
	if (modality !== undefined && course.modality !== modality) {
		return false;
	}
	if (status !== undefined && course.status !== status) {
		return false;
	}
	if (tag !== undefined && !course.tags.some((item) => normalize(item) === normalize(tag))) {
		return false;
	}
	if (keyword !== undefined && !containsKeyword(course, keyword)) {
		return false;
	}
	return true;
}

function containsKeyword(course: Course, keyword: string): boolean {
	const needle = normalize(keyword);
	if (normalize(course.title).includes(needle)) {
		return true;
	}
	if (normalize(course.summary).includes(needle)) {
		return true;
	}
	return course.tags.some((tag) => normalize(tag).includes(needle));
}

function compareCourses(sort: CourseSortField): (left: Course, right: Course) => number {
	return (left, right) => {
		const primary = sort === 'title' ? left.title.localeCompare(right.title, 'en', { sensitivity: 'base' }) : left[sort].localeCompare(right[sort]);
		if (primary !== 0) {
			return primary;
		}
		return left.id.localeCompare(right.id);
	};
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

function normalize(value: string): string {
	return value.toLocaleLowerCase('en-US');
}

function formatChoices(values: readonly string[]): string {
	const last = values[values.length - 1];
	if (last === undefined || values.length === 1) {
		return last ?? '';
	}
	return `${values.slice(0, -1).join(', ')}, or ${last}`;
}
