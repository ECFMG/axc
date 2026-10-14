import { type Course, type CourseModality, type CourseStatus, courseModalities, courseStatuses } from '@axc/domain';

const courseSortFields = ['title', 'createdAt', 'updatedAt'] as const;
type CourseSortField = (typeof courseSortFields)[number];

export interface CourseSearchQuery {
	readonly q?: string;
	readonly modality?: CourseModality;
	readonly status?: CourseStatus;
	readonly tag?: string;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

export interface CourseSearchPage {
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

export interface InvalidCourseQuery {
	error: {
		code: 'INVALID_QUERY_PARAMETER';
		message: 'One or more query parameters are invalid.';
		details: Array<{ field: string; message: string }>;
	};
}

const invalidQueryMessage = 'One or more query parameters are invalid.';
const queryFieldSet: ReadonlySet<string> = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

export function parseCourseQuery(params: Readonly<Record<string, readonly string[]>>): { ok: true; query: CourseSearchQuery } | { ok: false; error: InvalidCourseQuery } {
	const details: CourseQueryDetail[] = [];
	const q = presentValue(readField(params, 'q', details));
	const modality = readEnum(params, 'modality', courseModalities, 'modality must be online, in-person, or hybrid.', details);
	const status = readEnum(params, 'status', courseStatuses, 'status must be draft, active, or retired.', details);
	const tag = presentValue(readField(params, 'tag', details));
	const page = readBoundedInt(params, 'page', 1, undefined, 'page must be an integer greater than or equal to 1.', details);
	const pageSize = readBoundedInt(params, 'pageSize', 10, 50, 'pageSize must be between 1 and 50.', details);
	const sort = readEnum(params, 'sort', courseSortFields, 'sort must be title, createdAt, or updatedAt.', details) ?? 'title';

	for (const field of Object.keys(params)) {
		if (!queryFieldSet.has(field)) {
			details.push({ field, message: 'Unknown query parameter.' });
		}
	}

	if (details.length > 0) {
		return { ok: false, error: { error: { code: 'INVALID_QUERY_PARAMETER', message: invalidQueryMessage, details } } };
	}

	return {
		ok: true,
		query: {
			page,
			pageSize,
			sort,
			...(q === undefined || q === '' ? {} : { q }),
			...(modality === undefined ? {} : { modality }),
			...(status === undefined ? {} : { status }),
			...(tag === undefined || tag === '' ? {} : { tag }),
		},
	};
}

export function searchCourses(courses: readonly Course[], query: CourseSearchQuery): CourseSearchPage {
	const keyword = query.q?.toLowerCase();
	const tag = query.tag?.toLowerCase();
	const filtered = courses.filter((course) => {
		if (query.modality !== undefined && course.modality !== query.modality) {
			return false;
		}
		if (query.status !== undefined && course.status !== query.status) {
			return false;
		}
		if (tag !== undefined && !course.tags.some((item) => item.toLowerCase() === tag)) {
			return false;
		}
		if (keyword !== undefined && !matchesKeyword(course, keyword)) {
			return false;
		}
		return true;
	});
	const sorted = filtered.slice().sort((left, right) => compareCourses(left, right, query.sort));
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
	const start = (query.page - 1) * query.pageSize;
	return {
		items: sorted.slice(start, start + query.pageSize).map((course) => ({ ...course, tags: [...course.tags] })),
		page: query.page,
		pageSize: query.pageSize,
		totalItems,
		totalPages,
	};
}

type FieldRead = { readonly ok: true; readonly value?: string } | { readonly ok: false };

function presentValue(read: FieldRead): string | undefined {
	return read.ok ? read.value : undefined;
}

function readField(params: Readonly<Record<string, readonly string[]>>, field: string, details: CourseQueryDetail[]): FieldRead {
	const values = params[field];
	if (values === undefined) {
		return { ok: true };
	}
	const value = values[0];
	if (values.length !== 1 || value === undefined) {
		details.push({ field, message: `${field} must be provided once.` });
		return { ok: false };
	}
	return { ok: true, value };
}

function readEnum<T extends string>(params: Readonly<Record<string, readonly string[]>>, field: string, allowed: readonly T[], message: string, details: CourseQueryDetail[]): T | undefined {
	const read = readField(params, field, details);
	if (!read.ok || read.value === undefined) {
		return undefined;
	}
	const match = allowed.find((item) => item === read.value);
	if (match === undefined) {
		details.push({ field, message });
		return undefined;
	}
	return match;
}

function readBoundedInt(params: Readonly<Record<string, readonly string[]>>, field: string, fallback: number, max: number | undefined, message: string, details: CourseQueryDetail[]): number {
	const read = readField(params, field, details);
	if (!read.ok || read.value === undefined) {
		return fallback;
	}
	if (!/^[1-9][0-9]*$/.test(read.value)) {
		details.push({ field, message });
		return fallback;
	}
	const value = Number(read.value);
	if (max !== undefined && value > max) {
		details.push({ field, message });
		return fallback;
	}
	return value;
}

function matchesKeyword(course: Course, keyword: string): boolean {
	return course.title.toLowerCase().includes(keyword) || course.summary.toLowerCase().includes(keyword) || course.tags.some((item) => item.toLowerCase().includes(keyword));
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const compared = left[sort].localeCompare(right[sort], 'en');
	return compared === 0 ? left.id.localeCompare(right.id, 'en') : compared;
}
