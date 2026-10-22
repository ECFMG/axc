import type { Domain } from '@axc/domain';
import { courses } from './course.data.ts';

type Course = Domain.Contexts.Catalog.Course.Course;
type Query = Domain.Contexts.Catalog.Course.CourseSearchQuery;
type Result = Domain.Contexts.Catalog.Course.CourseSearchResult;
export interface CourseReadRepository {
	search(query: Query): Promise<Result>;
	getById(id: string): Promise<Course | undefined>;
}
export const CourseReadRepo: CourseReadRepository = {
	getById: (id) => Promise.resolve(structuredClone(courses.find((item) => item.id === id))),
	search(query) {
		const q = query.q?.toLowerCase();
		const tag = query.tag?.toLowerCase();
		const matches = courses.filter(
			(c) =>
				(!q || [c.title, c.summary, ...c.tags].some((text) => text.toLowerCase().includes(q))) &&
				(!query.modality || c.modality === query.modality) &&
				(!query.status || c.status === query.status) &&
				(!tag || c.tags.some((t) => t.toLowerCase() === tag)),
		);
		matches.sort((a, b) => a[query.sort].localeCompare(b[query.sort]) || a.id.localeCompare(b.id));
		const start = (query.page - 1) * query.pageSize;
		return Promise.resolve({ items: structuredClone(matches.slice(start, start + query.pageSize)), page: query.page, pageSize: query.pageSize, totalItems: matches.length, totalPages: Math.ceil(matches.length / query.pageSize) });
	},
};
