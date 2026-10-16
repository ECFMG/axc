import type { COURSE_MODALITIES, COURSE_SORT_FIELDS, COURSE_STATUSES } from './course.value-objects.ts';
export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: (typeof COURSE_MODALITIES)[number];
	status: (typeof COURSE_STATUSES)[number];
	tags: string[];
	createdAt: string;
	updatedAt: string;
}
export interface CourseSearch {
	q?: string;
	modality?: Course['modality'];
	status?: Course['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: (typeof COURSE_SORT_FIELDS)[number];
}
export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
export interface CourseReadRepository {
	search(criteria: CourseSearch): Promise<CoursePage>;
	queryById(id: string): Promise<Course | undefined>;
}
