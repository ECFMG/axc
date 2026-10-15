import type { CourseModality, CourseSortField, CourseStatus } from './course.value-objects.ts';

/** Read-only catalog entry; dates are ISO-8601 strings. */
export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

/** Typed search criteria; transport validation belongs to REST. */
export interface CourseSearchCriteria {
	readonly q?: string;
	readonly modality?: CourseModality;
	readonly status?: CourseStatus;
	readonly tag?: string;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSortField;
}

export interface CourseSearchResult {
	readonly items: readonly Course[];
	readonly totalItems: number;
}
