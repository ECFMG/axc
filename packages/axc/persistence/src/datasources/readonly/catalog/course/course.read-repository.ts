import type { Catalog } from '@axc/domain';

export interface CourseSearchQuery {
	q?: string;
	modality?: Catalog.Course.CourseModality;
	status?: Catalog.Course.CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: 'title' | 'createdAt' | 'updatedAt';
}
export interface CourseSearchResult {
	items: Catalog.Course.Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
export interface CourseReadRepository {
	getById(id: string): Promise<Catalog.Course.Course | null>;
	search(query: CourseSearchQuery): Promise<CourseSearchResult>;
}

export function createCourseReadRepository(courses: Catalog.Course.Course[]): CourseReadRepository {
	return {
		getById(id) {
			return Promise.resolve(courses.find((course) => course.id === id) ?? null);
		},
		search(query) {
			const q = query.q?.toLowerCase();
			const tag = query.tag?.toLowerCase();
			const matches = courses.filter(
				(course) =>
					(!q || [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(q))) &&
					(!query.modality || course.modality === query.modality) &&
					(!query.status || course.status === query.status) &&
					(!tag || course.tags.some((value) => value.toLowerCase() === tag)),
			);
			matches.sort((a, b) => a[query.sort].localeCompare(b[query.sort]) || a.id.localeCompare(b.id));
			return Promise.resolve({
				items: matches.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
				page: query.page,
				pageSize: query.pageSize,
				totalItems: matches.length,
				totalPages: Math.ceil(matches.length / query.pageSize),
			});
		},
	};
}
