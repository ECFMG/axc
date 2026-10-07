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

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface CourseReadRepository {
	search(query: CourseSearchQuery): Promise<CoursePage>;
}

export const getCourseReadRepository = (): CourseReadRepository => ({
	search: (query) => {
		const keyword = query.q?.toLocaleLowerCase();
		const tag = query.tag?.toLocaleLowerCase();
		const matching = courses.filter((course) => {
			if (query.modality && course.modality !== query.modality) return false;
			if (query.status && course.status !== query.status) return false;
			if (tag && !course.tags.some((value) => value.toLocaleLowerCase() === tag)) return false;
			if (keyword && ![course.title, course.summary, ...course.tags].some((value) => value.toLocaleLowerCase().includes(keyword))) return false;
			return true;
		});
		const sorted = [...matching].sort((left, right) => left[query.sort].localeCompare(right[query.sort]) || left.id.localeCompare(right.id));
		const start = (query.page - 1) * query.pageSize;
		return Promise.resolve({
			items: sorted.slice(start, start + query.pageSize).map((course) => ({ ...course, tags: [...course.tags] })),
			page: query.page,
			pageSize: query.pageSize,
			totalItems: matching.length,
			totalPages: Math.ceil(matching.length / query.pageSize),
		});
	},
});
