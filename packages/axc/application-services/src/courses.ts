import type { CoursePage, CourseRepository, CourseSearch } from '@axc/domain';

export function createCourseService(repository: CourseRepository) {
	return {
		async search(query: CourseSearch): Promise<CoursePage> {
			const keyword = query.q?.trim().toLowerCase();
			const tag = query.tag?.trim().toLowerCase();
			const courses = (await repository.list()).filter(
				(course) =>
					(!keyword || [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(keyword))) &&
					(!query.modality || course.modality === query.modality) &&
					(!query.status || course.status === query.status) &&
					(!tag || course.tags.some((value) => value.toLowerCase() === tag)),
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
