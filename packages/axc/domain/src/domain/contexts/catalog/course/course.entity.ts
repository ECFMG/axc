import type { COURSE_MODALITIES, COURSE_SORT_FIELDS, COURSE_STATUSES } from './course.value-objects.ts';

export interface CourseEntityReference {
	id: string;
	title: string;
	summary: string;
	modality: (typeof COURSE_MODALITIES)[number];
	status: (typeof COURSE_STATUSES)[number];
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface CourseSearchCriteria {
	q?: string;
	modality?: CourseEntityReference['modality'];
	status?: CourseEntityReference['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: (typeof COURSE_SORT_FIELDS)[number];
}

export interface CourseSearchResult {
	items: CourseEntityReference[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface CourseReadRepository {
	search(criteria: CourseSearchCriteria): Promise<CourseSearchResult>;
}

export interface DataSources {
	readonlyDataSource: { Catalog: { Course: { CourseReadRepository: CourseReadRepository } } };
}
