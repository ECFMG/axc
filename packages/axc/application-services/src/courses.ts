import { type Course, type CourseModality, type CourseStatus, isCourseModality, isCourseStatus } from '@axc/domain';
import type { CourseCatalog } from '@axc/persistence';
import { type ErrorDetail, invalidQuery } from './errors.ts';
import { type QueryParameters, readQueryValues } from './query.ts';

const courseSearchFields = ['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'] as const;
const courseSortFields = ['title', 'createdAt', 'updatedAt'] as const;
const defaultPage = 1;
const defaultPageSize = 10;
const maximumPageSize = 50;

type CourseSort = (typeof courseSortFields)[number];

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

export function createCourseSearch(catalog: CourseCatalog): {
	search(query: QueryParameters): CoursePage;
} {
	return {
		search(query: QueryParameters): CoursePage {
			const parsed = parseCourseQuery(query);
			const matched = catalog
				.listCourses()
				.filter((course) => matchesCourse(course, parsed))
				.sort(bySort(parsed.sort));
			const totalItems = matched.length;
			const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / parsed.pageSize);
			const start = (parsed.page - 1) * parsed.pageSize;
			return {
				items: matched.slice(start, start + parsed.pageSize),
				page: parsed.page,
				pageSize: parsed.pageSize,
				totalItems,
				totalPages,
			};
		},
	};
}

function parseCourseQuery(query: QueryParameters): ParsedCourseQuery {
	const details: ErrorDetail[] = [];
	const values = readQueryValues(query, courseSearchFields, details);
	const parsed: ParsedCourseQuery = { page: defaultPage, pageSize: defaultPageSize, sort: 'title' };

	const q = values.get('q');
	if (q !== undefined) {
		parsed.q = q;
	}

	const modality = values.get('modality');
	if (modality !== undefined) {
		if (isCourseModality(modality)) {
			parsed.modality = modality;
		} else {
			details.push({ field: 'modality', message: 'modality must be online, in-person, or hybrid.' });
		}
	}

	const status = values.get('status');
	if (status !== undefined) {
		if (isCourseStatus(status)) {
			parsed.status = status;
		} else {
			details.push({ field: 'status', message: 'status must be draft, active, or retired.' });
		}
	}

	const tag = values.get('tag');
	if (tag !== undefined) {
		parsed.tag = tag;
	}

	const page = values.get('page');
	if (page !== undefined) {
		const parsedPage = parsePositiveInteger(page);
		if (parsedPage === undefined) {
			details.push({ field: 'page', message: 'page must be an integer greater than or equal to 1.' });
		} else {
			parsed.page = parsedPage;
		}
	}

	const pageSize = values.get('pageSize');
	if (pageSize !== undefined) {
		const parsedPageSize = parsePositiveInteger(pageSize);
		if (parsedPageSize === undefined || parsedPageSize > maximumPageSize) {
			details.push({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		} else {
			parsed.pageSize = parsedPageSize;
		}
	}

	const sort = values.get('sort');
	if (sort !== undefined) {
		if (isCourseSort(sort)) {
			parsed.sort = sort;
		} else {
			details.push({ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' });
		}
	}

	if (details.length > 0) {
		throw invalidQuery(details);
	}
	return parsed;
}

function parsePositiveInteger(value: string): number | undefined {
	if (!/^[1-9]\d*$/.test(value)) {
		return undefined;
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return undefined;
	}
	return parsed;
}

function isCourseSort(value: string): value is CourseSort {
	return courseSortFields.some((item) => item === value);
}

function matchesCourse(course: Course, query: ParsedCourseQuery): boolean {
	if (query.modality !== undefined && course.modality !== query.modality) {
		return false;
	}
	if (query.status !== undefined && course.status !== query.status) {
		return false;
	}
	if (query.tag !== undefined && !course.tags.some((tag) => tag.toLowerCase() === query.tag?.toLowerCase())) {
		return false;
	}
	if (query.q !== undefined && !matchesKeyword(course, query.q)) {
		return false;
	}
	return true;
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function bySort(sort: CourseSort): (left: Course, right: Course) => number {
	return (left, right) => {
		const primary = left[sort].localeCompare(right[sort]);
		if (primary !== 0) {
			return primary;
		}
		return left.id.localeCompare(right.id);
	};
}
