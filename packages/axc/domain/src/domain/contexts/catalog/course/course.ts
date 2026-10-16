import type { CourseModality, CourseSort, CourseStatus } from './course.value-objects.ts';

export interface CourseEntityReference {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface CourseSearchCriteria {
	readonly q?: string | undefined;
	readonly modality?: CourseModality | undefined;
	readonly status?: CourseStatus | undefined;
	readonly tag?: string | undefined;
	readonly page: number;
	readonly pageSize: number;
	readonly sort: CourseSort;
}

export interface CourseSearchResult {
	readonly items: readonly CourseEntityReference[];
	readonly totalItems: number;
}

export interface CoursePage extends CourseSearchResult {
	readonly page: number;
	readonly pageSize: number;
	readonly totalPages: number;
}
