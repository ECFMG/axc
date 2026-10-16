import type { CourseModality, CourseSort, CourseStatus } from './course.value-objects.ts';
export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}
export interface CourseSearchCriteria {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSort;
}
export interface CourseSearchResult {
	items: Course[];
	totalItems: number;
	page: number;
	pageSize: number;
	totalPages: number;
}
export interface CourseReadRepository {
	search(criteria: CourseSearchCriteria): Promise<CourseSearchResult>;
	getById(id: string): Promise<Course | null>;
}
