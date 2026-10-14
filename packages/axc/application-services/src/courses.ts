import { COURSE_MODALITIES, COURSE_STATUSES, type Course, type CourseModality, type CourseStatus } from '@axc/domain';

const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;
type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

export interface CourseQueryInput {
	q?: string | undefined;
	modality?: string | undefined;
	status?: string | undefined;
	tag?: string | undefined;
	page?: string | undefined;
	pageSize?: string | undefined;
	sort?: string | undefined;
}

export interface QueryParameterDetail {
	field: string;
	message: string;
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseSearchCriteria {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

export class InvalidQueryParameterError extends Error {
	readonly code = 'INVALID_QUERY_PARAMETER' as const;
	readonly details: readonly QueryParameterDetail[];

	constructor(details: readonly QueryParameterDetail[]) {
		super('One or more query parameters are invalid.');
		this.name = 'InvalidQueryParameterError';
		this.details = details;
	}
}

export function parseCourseQuery(input: CourseQueryInput): CourseSearchCriteria {
	const details: QueryParameterDetail[] = [];
	const modality = readModality(input.modality, details);
	const status = readStatus(input.status, details);
	const page = readPage(input.page, details);
	const pageSize = readPageSize(input.pageSize, details);
	const sort = readSort(input.sort, details);
	if (details.length > 0) {
		throw new InvalidQueryParameterError(details);
	}

	const q = text(input.q);
	const tag = text(input.tag);
	return {
		page,
		pageSize,
		sort,
		...(q === undefined ? {} : { q }),
		...(modality === undefined ? {} : { modality }),
		...(status === undefined ? {} : { status }),
		...(tag === undefined ? {} : { tag }),
	};
}

export function searchCourses(courses: readonly Course[], criteria: CourseSearchCriteria): CoursePage {
	const filtered = courses.filter((course) => matches(course, criteria));
	const sorted = [...filtered].sort((left, right) => compareCourses(left, right, criteria.sort));
	const totalItems = sorted.length;
	const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / criteria.pageSize);
	const start = (criteria.page - 1) * criteria.pageSize;
	return {
		items: sorted.slice(start, start + criteria.pageSize).map(cloneCourse),
		page: criteria.page,
		pageSize: criteria.pageSize,
		totalItems,
		totalPages,
	};
}

function readModality(value: string | undefined, details: QueryParameterDetail[]): CourseModality | undefined {
	const trimmed = text(value);
	if (trimmed === undefined) {
		return undefined;
	}
	if (!isOneOf(COURSE_MODALITIES, trimmed)) {
		details.push({ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' });
		return undefined;
	}
	return trimmed;
}

function readStatus(value: string | undefined, details: QueryParameterDetail[]): CourseStatus | undefined {
	const trimmed = text(value);
	if (trimmed === undefined) {
		return undefined;
	}
	if (!isOneOf(COURSE_STATUSES, trimmed)) {
		details.push({ field: 'status', message: 'status must be one of draft, active, retired.' });
		return undefined;
	}
	return trimmed;
}

function readPage(value: string | undefined, details: QueryParameterDetail[]): number {
	const trimmed = text(value);
	if (trimmed === undefined) {
		return DEFAULT_PAGE;
	}
	const parsed = parseInteger(trimmed);
	if (parsed === undefined) {
		details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		return DEFAULT_PAGE;
	}
	return parsed;
}

function readPageSize(value: string | undefined, details: QueryParameterDetail[]): number {
	const trimmed = text(value);
	if (trimmed === undefined) {
		return DEFAULT_PAGE_SIZE;
	}
	const parsed = parseInteger(trimmed);
	if (parsed === undefined || parsed > MAX_PAGE_SIZE) {
		details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		return DEFAULT_PAGE_SIZE;
	}
	return parsed;
}

function readSort(value: string | undefined, details: QueryParameterDetail[]): CourseSortField {
	const trimmed = text(value);
	if (trimmed === undefined) {
		return 'title';
	}
	if (!isOneOf(COURSE_SORT_FIELDS, trimmed)) {
		details.push({ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' });
		return 'title';
	}
	return trimmed;
}

function matches(course: Course, criteria: CourseSearchCriteria): boolean {
	if (criteria.modality !== undefined && course.modality !== criteria.modality) {
		return false;
	}
	if (criteria.status !== undefined && course.status !== criteria.status) {
		return false;
	}
	if (criteria.tag !== undefined) {
		const requestedTag = criteria.tag.toLowerCase();
		if (!course.tags.some((tag) => tag.toLowerCase() === requestedTag)) {
			return false;
		}
	}
	if (criteria.q !== undefined && !matchesKeyword(course, criteria.q)) {
		return false;
	}
	return true;
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const compared = sort === 'title' ? left.title.localeCompare(right.title, 'en', { sensitivity: 'base' }) : left[sort].localeCompare(right[sort]);
	return compared === 0 ? left.id.localeCompare(right.id) : compared;
}

function cloneCourse(course: Course): Course {
	return {
		...course,
		tags: [...course.tags],
	};
}

function text(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

function parseInteger(value: string): number | undefined {
	if (!/^[1-9]\d*$/.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function isOneOf<T extends string>(values: readonly T[], value: string): value is T {
	return values.some((candidate) => candidate === value);
}
