import type { Course, CourseRepository } from '@axc/domain';

export interface CourseQuery {
	q?: string;
	modality?: Course['modality'];
	status?: Course['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: 'title' | 'createdAt' | 'updatedAt';
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export function createCourseService(repository: CourseRepository) {
	return {
		async search(query: CourseQuery): Promise<CoursePage> {
			const keyword = query.q?.toLowerCase();
			const tag = query.tag?.toLowerCase();
			const courses = (await repository.list()).filter(
				(course) =>
					(!keyword || [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(keyword))) &&
					(!query.modality || course.modality === query.modality) &&
					(!query.status || course.status === query.status) &&
					(!tag || course.tags.some((value) => value.toLowerCase() === tag)),
			);
			courses.sort((left, right) => left[query.sort].localeCompare(right[query.sort]) || left.id.localeCompare(right.id));
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
