import type { Course, CourseCatalogRepository } from '@axc/domain';

export const COURSE_SORTS = ['title', 'createdAt', 'updatedAt'] as const;
export const DEFAULT_COURSE_PAGE = 1;
export const DEFAULT_COURSE_PAGE_SIZE = 10;
export const MAX_COURSE_PAGE_SIZE = 50;

export interface CourseSearch {
	q?: string;
	modality?: Course['modality'];
	status?: Course['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: (typeof COURSE_SORTS)[number];
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export function createCourseService(repository: CourseCatalogRepository) {
	return {
		async search(query: CourseSearch): Promise<CoursePage> {
			const keyword = query.q?.toLowerCase();
			const tag = query.tag?.toLowerCase();
			const courses = (await repository.list()).filter(
				(course) =>
					(!keyword || [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(keyword))) &&
					(query.modality === undefined || course.modality === query.modality) &&
					(query.status === undefined || course.status === query.status) &&
					(tag === undefined || course.tags.some((value) => value.toLowerCase() === tag)),
			);
			courses.sort((a, b) => a[query.sort].localeCompare(b[query.sort]) || a.id.localeCompare(b.id));
			const offset = (query.page - 1) * query.pageSize;
			return {
				items: courses.slice(offset, offset + query.pageSize),
				page: query.page,
				pageSize: query.pageSize,
				totalItems: courses.length,
				totalPages: Math.ceil(courses.length / query.pageSize),
			};
		},
	};
}
