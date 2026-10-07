import type { Course, CourseModality, CourseStatus } from './course.ts';

/** Course fields the catalog can be sorted by. */
export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

/** Catalog search policy. Callers that omit a value get these. */
export const DEFAULT_COURSE_SORT: CourseSortField = 'title';
export const DEFAULT_COURSE_PAGE = 1;
export const DEFAULT_COURSE_PAGE_SIZE = 10;
export const MIN_COURSE_PAGE_SIZE = 1;
export const MAX_COURSE_PAGE_SIZE = 50;

export function isCourseSortField(value: string): value is CourseSortField {
	return (COURSE_SORT_FIELDS as readonly string[]).includes(value);
}

/**
 * A validated catalog search request.
 *
 * @remarks
 * `keyword` and `tag` are already trimmed. Blank values are represented as `undefined`,
 * meaning "do not filter on this field".
 */
export interface CourseSearchCriteria {
	readonly keyword?: string | undefined;
	readonly modality?: CourseModality | undefined;
	readonly status?: CourseStatus | undefined;
	readonly tag?: string | undefined;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

/** The page of courses a repository found for a {@link CourseSearchCriteria}. */
export interface CourseSearchMatches {
	readonly items: readonly Course[];
	readonly totalItems: number;
}

/** Read side of the course catalog. Implemented by `@axc/persistence`. */
export interface CourseCatalogReadRepository {
	search(criteria: CourseSearchCriteria): Promise<CourseSearchMatches>;
}
