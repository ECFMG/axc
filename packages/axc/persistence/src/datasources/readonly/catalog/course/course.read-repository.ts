import type { Catalog } from '@axc/domain';
import { courses } from './course.data.ts';

type Course = Catalog.Course.Course;

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
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface CourseReadRepository {
	search(query: CourseSearchQuery): Promise<CourseSearchResult>;
}

export const getCourseReadRepository = (): CourseReadRepository => ({
	search(query) {
		const keyword = query.q?.toLocaleLowerCase();
		const tag = query.tag?.toLocaleLowerCase();
		const matches = courses.filter(
			(course) =>
				(!keyword || [course.title, course.summary, ...course.tags].some((value) => value.toLocaleLowerCase().includes(keyword))) &&
				(!query.modality || course.modality === query.modality) &&
				(!query.status || course.status === query.status) &&
				(!tag || course.tags.some((value) => value.toLocaleLowerCase() === tag)),
		);
		const sorted = [...matches].sort((left, right) => left[query.sort].localeCompare(right[query.sort]) || left.id.localeCompare(right.id));
		const offset = (query.page - 1) * query.pageSize;
		return Promise.resolve({
			items: sorted.slice(offset, offset + query.pageSize).map((course) => ({ ...course, tags: [...course.tags] })),
			page: query.page,
			pageSize: query.pageSize,
			totalItems: matches.length,
			totalPages: Math.ceil(matches.length / query.pageSize),
		});
	},
});
