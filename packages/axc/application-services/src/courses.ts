import { type Course, type CourseModality, type CourseStatus, courseModalities, courseStatuses } from '@axc/domain';

const supportedQueryFields = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'] as const;
const courseSorts = ['title', 'createdAt', 'updatedAt'] as const;

type CourseSort = (typeof courseSorts)[number];

export interface CourseQueryValues {
	readonly [field: string]: readonly string[] | undefined;
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface InvalidQueryDetail {
	field: string;
	message: string;
}

export interface InvalidQueryResponse {
	error: {
		code: 'INVALID_QUERY_PARAMETER';
		message: 'One or more query parameters are invalid.';
		details: InvalidQueryDetail[];
	};
}

export type CourseSearchOutcome = CoursePage | InvalidQueryResponse;

interface ParsedCourseQuery {
	readonly q?: string;
	readonly modality?: CourseModality;
	readonly status?: CourseStatus;
	readonly tag?: string;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSort;
}

export function searchCourses(courses: readonly Course[], rawQuery: CourseQueryValues): CourseSearchOutcome {
	const parsed = parseCourseQuery(rawQuery);
	if ('error' in parsed) {
		return parsed;
	}
	const matched = courses.filter((course) => matchesCourse(course, parsed.query));
	matched.sort((left, right) => compareCourses(left, right, parsed.query.sort));
	const start = (parsed.query.page - 1) * parsed.query.pageSize;
	return {
		items: matched.slice(start, start + parsed.query.pageSize),
		page: parsed.query.page,
		pageSize: parsed.query.pageSize,
		totalItems: matched.length,
		totalPages: matched.length === 0 ? 0 : Math.ceil(matched.length / parsed.query.pageSize),
	};
}

function parseCourseQuery(rawQuery: CourseQueryValues): { query: ParsedCourseQuery } | InvalidQueryResponse {
	const details: InvalidQueryDetail[] = [];
	for (const field of Object.keys(rawQuery)) {
		if (!isSupportedQueryField(field)) {
			details.push({ field, message: `${field} is not a supported query parameter.` });
		}
	}

	const q = parseText(readSingle(rawQuery, 'q', details), 'q', 'q must not be empty.', details);
	const modality = parseAllowed(readSingle(rawQuery, 'modality', details), 'modality', courseModalities, 'modality must be online, in-person, or hybrid.', details);
	const status = parseAllowed(readSingle(rawQuery, 'status', details), 'status', courseStatuses, 'status must be draft, active, or retired.', details);
	const tag = parseText(readSingle(rawQuery, 'tag', details), 'tag', 'tag must not be empty.', details);
	const page = parsePage(readSingle(rawQuery, 'page', details), details);
	const pageSize = parsePageSize(readSingle(rawQuery, 'pageSize', details), details);
	const sort = parseSort(readSingle(rawQuery, 'sort', details), details);

	if (details.length > 0) {
		return {
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details,
			},
		};
	}

	return {
		query: {
			...(q === undefined ? {} : { q }),
			...(modality === undefined ? {} : { modality }),
			...(status === undefined ? {} : { status }),
			...(tag === undefined ? {} : { tag }),
			page,
			pageSize,
			sort,
		},
	};
}

function isSupportedQueryField(field: string): field is (typeof supportedQueryFields)[number] {
	return (supportedQueryFields as readonly string[]).includes(field);
}

function readSingle(rawQuery: CourseQueryValues, field: string, details: InvalidQueryDetail[]): string | undefined {
	const values = rawQuery[field];
	if (values === undefined || values.length === 0) {
		return undefined;
	}
	if (values.length > 1) {
		details.push({ field, message: `${field} must be provided once.` });
		return undefined;
	}
	return values[0];
}

function parseText(value: string | undefined, field: string, message: string, details: InvalidQueryDetail[]): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		details.push({ field, message });
		return undefined;
	}
	return trimmed;
}

function parseAllowed<T extends string>(value: string | undefined, field: string, allowed: readonly T[], message: string, details: InvalidQueryDetail[]): T | undefined {
	if (value === undefined) {
		return undefined;
	}
	const match = allowed.find((candidate) => candidate === value.trim());
	if (match === undefined) {
		details.push({ field, message });
		return undefined;
	}
	return match;
}

function parsePage(value: string | undefined, details: InvalidQueryDetail[]): number {
	if (value === undefined) {
		return 1;
	}
	const parsed = parseBoundedInteger(value.trim(), 1, Number.MAX_SAFE_INTEGER);
	if (parsed === undefined) {
		details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		return 1;
	}
	return parsed;
}

function parsePageSize(value: string | undefined, details: InvalidQueryDetail[]): number {
	if (value === undefined) {
		return 10;
	}
	const parsed = parseBoundedInteger(value.trim(), 1, 50);
	if (parsed === undefined) {
		details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		return 10;
	}
	return parsed;
}

function parseSort(value: string | undefined, details: InvalidQueryDetail[]): CourseSort {
	if (value === undefined) {
		return 'title';
	}
	const match = courseSorts.find((candidate) => candidate === value.trim());
	if (match === undefined) {
		details.push({ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' });
		return 'title';
	}
	return match;
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

function matchesCourse(course: Course, query: ParsedCourseQuery): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	const tag = query.tag;
	if (tag !== undefined && !course.tags.some((courseTag) => courseTag.toLowerCase() === tag.toLowerCase())) {
		return false;
	}
	const keyword = query.q;
	if (keyword !== undefined && !matchesKeyword(course, keyword)) {
		return false;
	}
	return true;
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function compareCourses(left: Course, right: Course, sort: CourseSort): number {
	const primary = sort === 'title' ? left.title.localeCompare(right.title, 'en', { sensitivity: 'base' }) : left[sort].localeCompare(right[sort]);
	return primary === 0 ? left.id.localeCompare(right.id) : primary;
}
