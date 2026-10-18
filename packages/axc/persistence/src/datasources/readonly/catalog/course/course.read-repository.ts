import type { Domain } from '@axc/domain';
import { courses } from './course.data.ts';

type C = Domain.Contexts.Catalog.Course;
type Q = Domain.Contexts.Catalog.CourseQuery;
export interface CourseReadRepository {
	search(query: Q): Promise<Domain.Contexts.Catalog.CourseResult>;
	getById(id: string): Promise<C | undefined>;
}
export function courseReadRepository(): CourseReadRepository {
	return {
		getById(id) {
			return Promise.resolve(structuredClone(courses.find((c) => c.id === id)));
		},
		search(query) {
			const matching = courses
				.filter(
					(c) =>
						(!query.q || [c.title, c.summary, ...c.tags].some((s) => s.toLowerCase().includes(query.q?.toLowerCase() ?? ''))) &&
						(!query.modality || c.modality === query.modality) &&
						(!query.status || c.status === query.status) &&
						(!query.tag || c.tags.some((t) => t.toLowerCase() === query.tag?.toLowerCase())),
				)
				.sort((a, b) => a[query.sort].localeCompare(b[query.sort]) || a.id.localeCompare(b.id));
			const start = (query.page - 1) * query.pageSize;
			return Promise.resolve({
				items: structuredClone(matching.slice(start, start + query.pageSize)),
				page: query.page,
				pageSize: query.pageSize,
				totalItems: matching.length,
				totalPages: Math.ceil(matching.length / query.pageSize),
			});
		},
	};
}
