import { type Course, type CourseModality, type CourseStatus, courseModalities, courseStatuses } from '@axc/domain';

export const courseSortFields = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSortField = (typeof courseSortFields)[number];

export const INVALID_QUERY_CODE = 'INVALID_QUERY_PARAMETER' as const;
export const INVALID_QUERY_MESSAGE = 'One or more query parameters are invalid.' as const;

const supportedParameters = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'] as const;
type SupportedParameter = (typeof supportedParameters)[number];

const supportedParameterNames = new Set<string>(supportedParameters);
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
export type CourseQueryInput = Readonly<Record<string, readonly string[]>>;

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

function parseCourseQuery(query: CourseQueryInput): { ok: true; value: ParsedCourseQuery } | { ok: false; error: CourseQueryError } {
	const details: CourseQueryErrorDetail[] = [];
	const singles = new Map<SupportedParameter, string>();

	for (const parameter of supportedParameters) {
		const values = query[parameter];
		if (values === undefined) {
			continue;
		}
		const only = values.length === 1 ? values[0] : undefined;
		if (only === undefined) {
			details.push({ field: parameter, message: `${parameter} must be specified once.` });
			continue;
		}
		singles.set(parameter, only);
	}

	const keyword = readKeyword(singles.get('q'));
	const modality = readModality(singles.get('modality'), details);
	const status = readStatus(singles.get('status'), details);
	const tag = readTag(singles.get('tag'), details);
	const page = readPage(singles.get('page'), details);
	const pageSize = readPageSize(singles.get('pageSize'), details);
	const sort = readSort(singles.get('sort'), details);
	const unknownFields = Object.keys(query)
		.filter((key) => !supportedParameterNames.has(key))
		.sort((left, right) => left.localeCompare(right));
	for (const field of unknownFields) {
		details.push({ field, message: `${field} is not a supported query parameter.` });
	}

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

function readModality(value: string | undefined, details: CourseQueryErrorDetail[]): CourseModality | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (!isAllowed(value, courseModalities)) {
		details.push({ field: 'modality', message: 'modality must be one of online, in-person, or hybrid.' });
		return undefined;
	}
	return value;
}

function readStatus(value: string | undefined, details: CourseQueryErrorDetail[]): CourseStatus | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (!isAllowed(value, courseStatuses)) {
		details.push({ field: 'status', message: 'status must be one of draft, active, or retired.' });
		return undefined;
	}
	return value;
}

function readTag(value: string | undefined, details: CourseQueryErrorDetail[]): string | undefined {
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

function readPage(value: string | undefined, details: CourseQueryErrorDetail[]): number {
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

function readPageSize(value: string | undefined, details: CourseQueryErrorDetail[]): number {
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

function readSort(value: string | undefined, details: CourseQueryErrorDetail[]): CourseSortField {
	if (value === undefined) {
		return 'title';
	}
	if (!isAllowed(value, courseSortFields)) {
		details.push({ field: 'sort', message: 'sort must be one of title, createdAt, or updatedAt.' });
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
