import type { Course, CourseModality, CourseStatus } from './course.ts';

/** Fields the catalog can be ordered by. */
export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export const DEFAULT_COURSE_PAGE = 1;
export const DEFAULT_COURSE_PAGE_SIZE = 10;
export const MAX_COURSE_PAGE_SIZE = 50;
export const DEFAULT_COURSE_SORT_FIELD: CourseSortField = 'title';

export function isCourseSortField(value: string): value is CourseSortField {
	return (COURSE_SORT_FIELDS as readonly string[]).includes(value);
}

/** A fully resolved catalog query. Defaults have already been applied. */
export interface CourseSearchCriteria {
	/** Free-text term matched against title, summary, and tags. */
	readonly keyword?: string | undefined;
	readonly modality?: CourseModality | undefined;
	readonly status?: CourseStatus | undefined;
	/** Exact tag match, compared case-insensitively. */
	readonly tag?: string | undefined;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

/** One page of catalog results plus the metadata needed to page through the rest. */
export interface CourseSearchPage {
	readonly items: readonly Course[];
	readonly page: number;
	readonly pageSize: number;
	readonly totalItems: number;
	readonly totalPages: number;
}

/** A read model over the course catalog. Implemented by the persistence layer. */
export interface CourseReadRepository {
	search(criteria: CourseSearchCriteria): Promise<CourseSearchPage>;
}

/**
 * Applies the catalog search rules to an in-memory collection.
 *
 * @remarks
 * Filtering, ordering, and pagination semantics live here so every repository
 * implementation answers a given {@link CourseSearchCriteria} identically.
 * Ordering is ascending for all sort fields, with `title` then `id` as tie-breakers.
 */
export function searchCourses(courses: readonly Course[], criteria: CourseSearchCriteria): CourseSearchPage {
	const matches = courses.filter((course) => matchesCriteria(course, criteria));
	const ordered = [...matches].sort((left, right) => compareCourses(left, right, criteria.sort));
	const totalItems = ordered.length;
	const totalPages = Math.ceil(totalItems / criteria.pageSize);
	const offset = (criteria.page - 1) * criteria.pageSize;

	return {
		items: ordered.slice(offset, offset + criteria.pageSize),
		page: criteria.page,
		pageSize: criteria.pageSize,
		totalItems,
		totalPages,
	};
}

function matchesCriteria(course: Course, criteria: CourseSearchCriteria): boolean {
	if (criteria.modality !== undefined && course.modality !== criteria.modality) {
		return false;
	}
	if (criteria.status !== undefined && course.status !== criteria.status) {
		return false;
	}
	if (criteria.tag !== undefined && !hasTag(course, criteria.tag)) {
		return false;
	}
	if (criteria.keyword !== undefined && !matchesKeyword(course, criteria.keyword)) {
		return false;
	}
	return true;
}

function hasTag(course: Course, tag: string): boolean {
	const needle = tag.toLowerCase();
	return course.tags.some((candidate) => candidate.toLowerCase() === needle);
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	if (sort === 'title') {
		return compareTitles(left, right) || left.id.localeCompare(right.id);
	}
	const primary = left[sort].localeCompare(right[sort]);
	return primary || compareTitles(left, right) || left.id.localeCompare(right.id);
}

function compareTitles(left: Course, right: Course): number {
	return left.title.localeCompare(right.title, 'en', { sensitivity: 'base' });
}
