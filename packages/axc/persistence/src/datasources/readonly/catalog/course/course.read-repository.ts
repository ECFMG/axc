import type { Domain } from '@axc/domain';
import { courseData } from './course.data.ts';

type Query = Domain.Contexts.Catalog.Course.CourseSearchQuery;
type Result = Domain.Contexts.Catalog.Course.CourseSearchResult;
export interface CourseReadRepository {
	search(query: Query): Promise<Result>;
}
export function createCourseReadRepository(): CourseReadRepository {
	return {
		search(query) {
			const q = query.q?.trim().toLowerCase();
			const tag = query.tag?.trim().toLowerCase();
			const matches = courseData.filter(
				(course) =>
					(!q || [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(q))) &&
					(!query.modality || course.modality === query.modality) &&
					(!query.status || course.status === query.status) &&
					(!tag || course.tags.some((value) => value.toLowerCase() === tag)),
			);
			matches.sort((a, b) => a[query.sort].localeCompare(b[query.sort]) || a.id.localeCompare(b.id));
			const start = (query.page - 1) * query.pageSize;
			return Promise.resolve({
				items: matches.slice(start, start + query.pageSize).map((course) => ({ ...course, tags: [...course.tags] })),
				page: query.page,
				pageSize: query.pageSize,
				totalItems: matches.length,
				totalPages: Math.ceil(matches.length / query.pageSize),
			});
		},
	};
}
