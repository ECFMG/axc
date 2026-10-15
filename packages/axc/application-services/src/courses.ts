import type { CourseCatalog, CourseSearch, CourseSearchResult } from '@axc/domain';

export function createCourseService(catalog: CourseCatalog) {
	return {
		async search(query: CourseSearch): Promise<CourseSearchResult> {
			const q = query.q?.toLowerCase();
			const tag = query.tag?.toLowerCase();
			const matches = (await catalog.list()).filter(
				(course) =>
					(!q || [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(q))) &&
					(!query.modality || course.modality === query.modality) &&
					(!query.status || course.status === query.status) &&
					(!tag || course.tags.some((value) => value.toLowerCase() === tag)),
			);
			matches.sort((a, b) => a[query.sort].localeCompare(b[query.sort]) || a.id.localeCompare(b.id));
			const offset = (query.page - 1) * query.pageSize;
			return {
				items: matches.slice(offset, offset + query.pageSize),
				page: query.page,
				pageSize: query.pageSize,
				totalItems: matches.length,
				totalPages: Math.ceil(matches.length / query.pageSize),
			};
		},
	};
}
