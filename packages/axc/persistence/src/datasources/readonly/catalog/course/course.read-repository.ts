import type { Domain } from '@axc/domain';
import { courses } from './course.data.ts';

type Query = Domain.Contexts.Catalog.Course.CourseSearchQuery;
type Result = Domain.Contexts.Catalog.Course.CourseSearchResult;
export interface CourseReadRepository {
	search(query: Query): Promise<Result>;
}
export const CourseReadRepo = (): CourseReadRepository => ({
	search(query) {
		const keyword = query.q?.toLowerCase();
		const tag = query.tag?.toLowerCase();
		const matches = courses
			.filter(
				(course) =>
					(!keyword || [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(keyword))) &&
					(!query.modality || course.modality === query.modality) &&
					(!query.status || course.status === query.status) &&
					(!tag || course.tags.some((value) => value.toLowerCase() === tag)),
			)
			.sort((a, b) => a[query.sort].localeCompare(b[query.sort]) || a.id.localeCompare(b.id));
		const totalItems = matches.length;
		// Avoid multiplying arbitrarily large valid page numbers.
		const start = query.page > Math.ceil(totalItems / query.pageSize) ? totalItems : (query.page - 1) * query.pageSize;
		return Promise.resolve({
			items: matches.slice(start, start + query.pageSize).map((course) => ({ ...course, tags: [...course.tags] })),
			page: query.page,
			pageSize: query.pageSize,
			totalItems,
			totalPages: Math.ceil(totalItems / query.pageSize),
		});
	},
});
