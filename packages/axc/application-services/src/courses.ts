import type { Course, CourseCatalog } from '@axc/domain';

export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

export interface CourseSearch {
	q?: string;
	modality?: Course['modality'];
	status?: Course['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: (typeof COURSE_SORT_FIELDS)[number];
}

export interface CourseSearchResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export function createCoursesService(catalog: CourseCatalog) {
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
			matches.sort((a, b) => {
				const left = a[query.sort];
				const right = b[query.sort];
				const order = query.sort === 'title' ? left.localeCompare(right, 'en') : left < right ? -1 : left > right ? 1 : 0;
				return order || a.id.localeCompare(b.id, 'en');
			});
			const start = (query.page - 1) * query.pageSize;
			return {
				items: matches.slice(start, start + query.pageSize),
				page: query.page,
				pageSize: query.pageSize,
				totalItems: matches.length,
				totalPages: Math.ceil(matches.length / query.pageSize),
			};
		},
	};
}
