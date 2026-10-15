import type { Modality, SortField, Status } from './course.value-objects.ts';

export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: Modality;
	readonly status: Status;
	readonly tags: string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

/** Typed input; HTTP validation and defaults belong to the REST layer. */
export interface CourseQuery {
	q?: string | undefined;
	modality?: Modality | undefined;
	status?: Status | undefined;
	tag?: string | undefined;
	page: number;
	pageSize: number;
	sort: SortField;
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
