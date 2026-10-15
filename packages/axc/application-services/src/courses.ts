import {
	type Course,
	type CourseModality,
	type CourseRepository,
	type CourseSort,
	type CourseStatus,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	isCourseModality,
	isCourseSort,
	isCourseStatus,
	MAX_COURSE_PAGE_SIZE,
} from '@axc/domain';
import { type FieldError, failure, invalidQuery, type ServiceResult, success } from './service-result.ts';

const COURSE_QUERY_FIELDS = new Set(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort']);

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface ParsedCourseQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSort;
}

export async function searchCourses(courses: CourseRepository, query: Readonly<Record<string, string>>): Promise<ServiceResult<CoursePage>> {
	const parsed = parseCourseQuery(query);
	if (!parsed.ok) {
		return parsed;
	}

	const filters = parsed.value;
	const matched = (await courses.list())
		.filter((course) => courseMatches(course, filters))
		.sort((left, right) => {
			const primary = left[filters.sort].localeCompare(right[filters.sort]);
			return primary === 0 ? left.id.localeCompare(right.id) : primary;
		});
	const totalItems = matched.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / filters.pageSize);
	const start = (filters.page - 1) * filters.pageSize;
	return success({
		items: matched.slice(start, start + filters.pageSize),
		page: filters.page,
		pageSize: filters.pageSize,
		totalItems,
		totalPages,
	});
}

function courseMatches(course: Course, filters: ParsedCourseQuery): boolean {
	if (filters.q !== undefined) {
		const needle = filters.q.toLowerCase();
		const inTags = course.tags.some((tag) => tag.toLowerCase().includes(needle));
		if (!course.title.toLowerCase().includes(needle) && !course.summary.toLowerCase().includes(needle) && !inTags) {
			return false;
		}
	}
	if (filters.modality !== undefined && course.modality !== filters.modality) {
		return false;
	}
	if (filters.status !== undefined && course.status !== filters.status) {
		return false;
	}
	if (filters.tag !== undefined) {
		const needle = filters.tag.toLowerCase();
		if (!course.tags.some((tag) => tag.toLowerCase() === needle)) {
			return false;
		}
	}
	return true;
}

function parseCourseQuery(query: Readonly<Record<string, string>>): ServiceResult<ParsedCourseQuery> {
	const details: FieldError[] = [];
	for (const field of Object.keys(query)) {
		if (!COURSE_QUERY_FIELDS.has(field)) {
			details.push({ field, message: `${field} is not a supported query parameter.` });
		}
	}

	const q = readText(query, 'q', details);
	const tag = readText(query, 'tag', details);
	const modality = readChoice(query, 'modality', isCourseModality, 'modality must be online, in-person, or hybrid.', details);
	const status = readChoice(query, 'status', isCourseStatus, 'status must be draft, active, or retired.', details);
	const sort = readSort(query, details);
	const page = readBoundedInt(query, 'page', DEFAULT_COURSE_PAGE, undefined, 'page must be an integer greater than or equal to 1.', details);
	const pageSize = readBoundedInt(query, 'pageSize', DEFAULT_COURSE_PAGE_SIZE, MAX_COURSE_PAGE_SIZE, 'pageSize must be between 1 and 50.', details);
	if (details.length > 0 || sort === undefined) {
		return failure(invalidQuery(details));
	}

	const parsed: ParsedCourseQuery = { page, pageSize, sort };
	if (q !== undefined) {
		parsed.q = q;
	}
	if (tag !== undefined) {
		parsed.tag = tag;
	}
	if (modality !== undefined) {
		parsed.modality = modality;
	}
	if (status !== undefined) {
		parsed.status = status;
	}
	return success(parsed);
}

function readText(query: Readonly<Record<string, string>>, field: 'q' | 'tag', details: FieldError[]): string | undefined {
	const value = query[field];
	if (value === undefined) {
		return undefined;
	}
	if (value.trim() === '') {
		details.push({ field, message: `${field} must not be empty.` });
		return undefined;
	}
	return value;
}

function readChoice<T extends string>(query: Readonly<Record<string, string>>, field: string, guard: (value: string) => value is T, message: string, details: FieldError[]): T | undefined {
	const value = query[field];
	if (value === undefined) {
		return undefined;
	}
	if (!guard(value)) {
		details.push({ field, message });
		return undefined;
	}
	return value;
}

function readSort(query: Readonly<Record<string, string>>, details: FieldError[]): CourseSort | undefined {
	const value = query['sort'];
	if (value === undefined) {
		return 'title';
	}
	if (!isCourseSort(value)) {
		details.push({ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' });
		return undefined;
	}
	return value;
}

function readBoundedInt(query: Readonly<Record<string, string>>, field: 'page' | 'pageSize', fallback: number, max: number | undefined, message: string, details: FieldError[]): number {
	const value = query[field];
	if (value === undefined) {
		return fallback;
	}
	if (!/^[1-9]\d*$/.test(value)) {
		details.push({ field, message });
		return fallback;
	}
	const parsed = Number(value);
	if (max !== undefined && parsed > max) {
		details.push({ field, message });
		return fallback;
	}
	return parsed;
}
