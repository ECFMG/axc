import { type CourseEntityReference, type CourseRepository, CourseSearchCriteria } from '@axc/domain';

export interface CourseSearchResult {
	items: CourseEntityReference[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface CourseApplicationService {
	search(query: Record<string, string | undefined>): Promise<CourseSearchResult>;
}

export const courseApplicationService = (courses: CourseRepository): CourseApplicationService => ({
	async search(query) {
		const criteria = CourseSearchCriteria.parse(query);
		const { items, totalItems } = await courses.search(criteria);
		return {
			items: items.map((course) => course.toReference()),
			page: criteria.page,
			pageSize: criteria.pageSize,
			totalItems,
			totalPages: Math.ceil(totalItems / criteria.pageSize),
		};
	},
});
