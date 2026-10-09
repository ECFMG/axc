import type { CourseCatalog, CourseSearch, CourseSearchResult } from '@axc/domain';

export function createCourseService(catalog: CourseCatalog) {
	return {
		async search(query: CourseSearch): Promise<CourseSearchResult> {
			const keyword = query.q?.toLowerCase();
			const tag = query.tag?.toLowerCase();
			const courses = (await catalog.list()).filter(
				(course) =>
					(!keyword || [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(keyword))) &&
					(query.modality === undefined || course.modality === query.modality) &&
					(query.status === undefined || course.status === query.status) &&
					(tag === undefined || course.tags.some((value) => value.toLowerCase() === tag)),
			);
			courses.sort((a, b) => a[query.sort].localeCompare(b[query.sort]) || a.id.localeCompare(b.id));
			const start = (query.page - 1) * query.pageSize;
			return {
				items: courses.slice(start, start + query.pageSize),
				page: query.page,
				pageSize: query.pageSize,
				totalItems: courses.length,
				totalPages: Math.ceil(courses.length / query.pageSize),
			};
		},
	};
}
