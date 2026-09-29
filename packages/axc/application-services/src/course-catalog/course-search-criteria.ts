import type { Course, CourseModality, CourseStatus } from './course.ts';

/** Allowed values for the `sort` query parameter. */
export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

/** Field the catalog is ordered by. */
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

/** Page returned when `page` is omitted. */
export const DEFAULT_PAGE = 1;

/** Page size returned when `pageSize` is omitted. */
export const DEFAULT_PAGE_SIZE = 10;

/** Largest page size a client may request. */
export const MAX_PAGE_SIZE = 50;

/** Ordering applied when `sort` is omitted. */
export const DEFAULT_SORT: CourseSortField = 'title';

/** A validated, fully defaulted catalog search request. */
export interface CourseSearchCriteria {
	/** Case-insensitive keyword matched against title, summary, and tags. */
	readonly q: string | undefined;
	readonly modality: CourseModality | undefined;
	readonly status: CourseStatus | undefined;
	/** Case-insensitive exact tag match. */
	readonly tag: string | undefined;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

/** A page of catalog results together with its pagination metadata. */
export interface CourseSearchResult {
	readonly items: readonly Course[];
	readonly page: number;
	readonly pageSize: number;
	readonly totalItems: number;
	readonly totalPages: number;
}
