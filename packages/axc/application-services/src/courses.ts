import { type Course, type CourseModality, type CourseSortField, type CourseStatus, courseModalities, courseSortFields, courseStatuses } from '@axc/domain';

const INVALID_QUERY_MESSAGE = 'One or more query parameters are invalid.';

export interface CourseSearchInput {
	q: string | undefined;
	modality: string | undefined;
	status: string | undefined;
	tag: string | undefined;
	page: string | undefined;
	pageSize: string | undefined;
	sort: string | undefined;
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseQueryDetail {
	field: string;
	message: string;
}

export interface CourseQueryErrorBody {
	error: {
		code: 'INVALID_QUERY_PARAMETER';
		message: typeof INVALID_QUERY_MESSAGE;
		details: CourseQueryDetail[];
	};
}

export type CourseSearchResult = { status: 200; body: CoursePage } | { status: 400; body: CourseQueryErrorBody };

interface CourseFilters {
	q: string | undefined;
	modality: CourseModality | undefined;
	status: CourseStatus | undefined;
	tag: string | undefined;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

export function searchCourses(courses: readonly Course[], query: CourseSearchInput): CourseSearchResult {
	const details: CourseQueryDetail[] = [];
	const filters: CourseFilters = {
		q: readText(query.q),
		modality: readEnum(query.modality, courseModalities, 'modality', 'modality must be online, in-person, or hybrid.', details),
		status: readEnum(query.status, courseStatuses, 'status', 'status must be draft, active, or retired.', details),
		tag: readText(query.tag)?.toLowerCase(),
		page: readInt(query.page, 1, undefined, 'page', 'page must be an integer greater than or equal to 1.', details),
		pageSize: readInt(query.pageSize, 10, 50, 'pageSize', 'pageSize must be between 1 and 50.', details),
		sort: readEnum(query.sort, courseSortFields, 'sort', 'sort must be title, createdAt, or updatedAt.', details) ?? 'title',
	};
	if (details.length > 0) {
		return {
			status: 400,
			body: {
				error: {
					code: 'INVALID_QUERY_PARAMETER',
					message: INVALID_QUERY_MESSAGE,
					details,
				},
			},
		};
	}

	const matched = courses.filter((course) => matches(course, filters));
	matched.sort((left, right) => compareCourses(filters.sort, left, right));
	const totalItems = matched.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / filters.pageSize);
	const start = (filters.page - 1) * filters.pageSize;
	return {
		status: 200,
		body: {
			items: matched.slice(start, start + filters.pageSize),
			page: filters.page,
			pageSize: filters.pageSize,
			totalItems,
			totalPages,
		},
	};
}

function matches(course: Course, filters: CourseFilters): boolean {
	if (filters.q !== undefined) {
		const needle = filters.q.toLowerCase();
		const values = [course.title, course.summary, ...course.tags];
		if (!values.some((value) => value.toLowerCase().includes(needle))) {
			return false;
		}
	}
	if (filters.modality !== undefined && course.modality !== filters.modality) {
		return false;
	}
	if (filters.status !== undefined && course.status !== filters.status) {
		return false;
	}
	if (filters.tag !== undefined && !course.tags.some((tag) => tag.toLowerCase() === filters.tag)) {
		return false;
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

function readText(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const normalized = value.trim();
	return normalized === '' ? undefined : normalized;
}

function readEnum<T extends string>(value: string | undefined, allowed: readonly T[], field: string, message: string, details: CourseQueryDetail[]): T | undefined {
	if (value === undefined) {
		return undefined;
	}
	const normalized = value.trim();
	if (isOneOf(normalized, allowed)) {
		return normalized;
	}
	details.push({ field, message });
	return undefined;
}

function readInt(value: string | undefined, fallback: number, max: number | undefined, field: string, message: string, details: CourseQueryDetail[]): number {
	if (value === undefined) {
		return fallback;
	}
	const normalized = value.trim();
	const parsed = /^[1-9]\d*$/.test(normalized) ? Number(normalized) : Number.NaN;
	if (!Number.isSafeInteger(parsed) || parsed < 1 || (max !== undefined && parsed > max)) {
		details.push({ field, message });
		return fallback;
	}
	return parsed;
}

function isOneOf<T extends string>(value: string, allowed: readonly T[]): value is T {
	return allowed.some((item) => item === value);
}
