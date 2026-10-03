import type { Course, CourseModality, CourseStatus } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

export interface CourseListQuery {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: 'title' | 'createdAt' | 'updatedAt';
}

export interface CourseListResult {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export const list =
	(dataSources: DataSources) =>
	async (query: CourseListQuery): Promise<CourseListResult> => {
		const keyword = query.q?.toLocaleLowerCase();
		const tag = query.tag?.toLocaleLowerCase();
		const courses = await dataSources.readonlyDataSource.Catalog.CourseReadRepo.list();
		const matches = courses.filter((course) => {
			if (query.modality && course.modality !== query.modality) return false;
			if (query.status && course.status !== query.status) return false;
			if (tag && !course.tags.some((value) => value.toLocaleLowerCase() === tag)) return false;
			return !keyword || [course.title, course.summary, ...course.tags].some((value) => value.toLocaleLowerCase().includes(keyword));
		});
		const sorted = matches.sort((left, right) => left[query.sort].localeCompare(right[query.sort]) || left.id.localeCompare(right.id));
		const totalItems = sorted.length;
		return {
			items: sorted.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
			page: query.page,
			pageSize: query.pageSize,
			totalItems,
			totalPages: Math.ceil(totalItems / query.pageSize),
		};
	};
