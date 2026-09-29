import type { Course, CourseModality, CourseStatus } from './course.ts';

/** Fields the course catalog can be sorted by. */
export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

/** Field the course catalog is sorted by. */
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

/** Page returned when the caller does not request one. */
export const DEFAULT_COURSE_PAGE = 1;

/** Page size returned when the caller does not request one. */
export const DEFAULT_COURSE_PAGE_SIZE = 10;

/** Largest page size the catalog will serve. */
export const MAX_COURSE_PAGE_SIZE = 50;

/** Sort applied when the caller does not request one. */
export const DEFAULT_COURSE_SORT_FIELD: CourseSortField = 'title';

/** Narrows an arbitrary string to a {@link CourseSortField}. */
export function isCourseSortField(value: string): value is CourseSortField {
	return (COURSE_SORT_FIELDS as readonly string[]).includes(value);
}

/** A fully resolved, already validated course catalog query. */
export interface CourseSearchCriteria {
	/** Case-insensitive keyword matched against title, summary, and tags. */
	readonly keyword?: string | undefined;
	/** Restricts results to a single delivery format. */
	readonly modality?: CourseModality | undefined;
	/** Restricts results to a single lifecycle state. */
	readonly status?: CourseStatus | undefined;
	/** Case-insensitive tag that a course must carry. */
	readonly tag?: string | undefined;
	/** One-based page number. */
	readonly page: number;
	/** Number of items per page. */
	readonly pageSize: number;
	/** Field the results are ordered by, ascending. */
	readonly sort: CourseSortField;
}

/** A single page of course catalog results together with its pagination metadata. */
export interface CourseSearchResult {
	/** Courses on the requested page. Empty when nothing matches. */
	readonly items: readonly Course[];
	/** Echo of the requested one-based page number. */
	readonly page: number;
	/** Echo of the resolved page size. */
	readonly pageSize: number;
	/** Total number of courses matching the filters, across all pages. */
	readonly totalItems: number;
	/** Number of pages the matching courses span. `0` when nothing matches. */
	readonly totalPages: number;
}

/** Read-side contract for querying the course catalog. */
export interface CourseReadRepository {
	/** Returns the page of courses matching `criteria`. */
	search(criteria: CourseSearchCriteria): Promise<CourseSearchResult>;
}
