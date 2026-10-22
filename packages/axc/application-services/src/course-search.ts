import {
	type Course,
	type CourseModality,
	type CourseSort,
	type CourseStatus,
	copyCourse,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	DEFAULT_COURSE_SORT,
	isCourseModality,
	isCourseSort,
	isCourseStatus,
	MAX_COURSE_PAGE_SIZE,
} from '@axc/domain';
import type { CourseCatalog } from '@axc/persistence';
import { ApplicationError, type ErrorDetail } from './errors.ts';

export interface CourseSearchInput {
	q?: string;
	modality?: string;
	status?: string;
	tag?: string;
	page?: string;
	pageSize?: string;
	sort?: string;
}

export interface CourseSearchResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface CourseSearchService {
	search(input: CourseSearchInput): CourseSearchResult;
}

interface ParsedCourseSearch {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSort;
}

export function createCourseSearch(catalog: CourseCatalog): CourseSearchService {
	return {
		search(input: CourseSearchInput): CourseSearchResult {
			const parsed = parseCourseSearchInput(input);
			const filtered = catalog.list().filter((course) => matchesCourse(course, parsed));
			const sorted = [...filtered].sort((left, right) => compareCourses(left, right, parsed.sort));
			const start = (parsed.page - 1) * parsed.pageSize;
			return {
				items: sorted.slice(start, start + parsed.pageSize).map((course) => copyCourse(course)),
				page: parsed.page,
				pageSize: parsed.pageSize,
				totalItems: sorted.length,
				totalPages: sorted.length === 0 ? 0 : Math.ceil(sorted.length / parsed.pageSize),
			};
		},
	};
}

function parseCourseSearchInput(input: CourseSearchInput): ParsedCourseSearch {
	const details: ErrorDetail[] = [];
	const parsed: ParsedCourseSearch = {
		page: parsePage(input.page, details),
		pageSize: parsePageSize(input.pageSize, details),
		sort: parseSort(input.sort, details),
	};

	const keyword = blankToUndefined(input.q);
	if (keyword !== undefined) {
		parsed.q = keyword;
	}

	if (input.modality !== undefined) {
		if (isCourseModality(input.modality)) {
			parsed.modality = input.modality;
		} else {
			details.push({ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' });
		}
	}

	if (input.status !== undefined) {
		if (isCourseStatus(input.status)) {
			parsed.status = input.status;
		} else {
			details.push({ field: 'status', message: 'status must be one of draft, active, retired.' });
		}
	}

	if (input.tag !== undefined) {
		const tag = input.tag.trim();
		if (tag.length === 0) {
			details.push({ field: 'tag', message: 'tag must be a non-empty string.' });
		} else {
			parsed.tag = tag;
		}
	}

	if (details.length > 0) {
		throw new ApplicationError('INVALID_QUERY_PARAMETER', details);
	}

	return parsed;
}

function parsePage(value: string | undefined, details: ErrorDetail[]): number {
	if (value === undefined) {
		return DEFAULT_COURSE_PAGE;
	}
	if (!/^[1-9]\d*$/u.test(value)) {
		details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		return DEFAULT_COURSE_PAGE;
	}
	return Number(value);
}

function parsePageSize(value: string | undefined, details: ErrorDetail[]): number {
	if (value === undefined) {
		return DEFAULT_COURSE_PAGE_SIZE;
	}
	if (!/^[1-9]\d*$/u.test(value) || Number(value) > MAX_COURSE_PAGE_SIZE) {
		details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		return DEFAULT_COURSE_PAGE_SIZE;
	}
	return Number(value);
}

function parseSort(value: string | undefined, details: ErrorDetail[]): CourseSort {
	if (value === undefined) {
		return DEFAULT_COURSE_SORT;
	}
	if (!isCourseSort(value)) {
		details.push({ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' });
		return DEFAULT_COURSE_SORT;
	}
	return value;
}

function matchesCourse(course: Course, query: ParsedCourseSearch): boolean {
	if (query.q !== undefined && !containsKeyword(course, query.q)) {
		return false;
	}
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	if (query.tag !== undefined) {
		const tag = query.tag.toLowerCase();
		if (!course.tags.some((candidate) => candidate.toLowerCase() === tag)) {
			return false;
		}
	}
	return true;
}

function containsKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	if (course.title.toLowerCase().includes(needle)) {
		return true;
	}
	if (course.summary.toLowerCase().includes(needle)) {
		return true;
	}
	return course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function compareCourses(left: Course, right: Course, sort: CourseSort): number {
	const primary = sort === 'title' ? compareText(left.title, right.title) : compareText(left[sort], right[sort]);
	if (primary !== 0) {
		return primary;
	}
	return compareText(left.id, right.id);
}

function compareText(left: string, right: string): number {
	const a = left.toLowerCase();
	const b = right.toLowerCase();
	if (a < b) {
		return -1;
	}
	if (a > b) {
		return 1;
	}
	return 0;
}

function blankToUndefined(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}
