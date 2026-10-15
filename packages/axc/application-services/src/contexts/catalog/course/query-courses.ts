import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

type Course = Domain.Contexts.Catalog.Course.Course;
type CourseQuery = Domain.Contexts.Catalog.Course.CourseQuery;

function matches(course: Course, query: CourseQuery): boolean {
	if (query.modality && course.modality !== query.modality) return false;
	if (query.status && course.status !== query.status) return false;
	if (query.tag && !course.tags.some((tag) => tag.toLowerCase() === query.tag?.toLowerCase())) return false;
	if (query.q) {
		const keyword = query.q.toLowerCase();
		const searchable = [course.title, course.summary, ...course.tags];
		if (!searchable.some((text) => text.toLowerCase().includes(keyword))) return false;
	}
	return true;
}

function compareText(left: string, right: string): number {
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

export const queryCourses = (dataSources: DataSources) => {
	return async (query: CourseQuery): Promise<Domain.Contexts.Catalog.Course.CoursePage> => {
		const courses = await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.getAll();
		const matching = courses.filter((course) => matches(course, query));
		matching.sort((left, right) => {
			const comparison = compareText(left[query.sort], right[query.sort]);
			return comparison || compareText(left.id, right.id);
		});
		const totalItems = matching.length;
		const totalPages = Math.ceil(totalItems / query.pageSize);
		const start = (query.page - 1) * query.pageSize;
		return {
			items: matching.slice(start, start + query.pageSize),
			page: query.page,
			pageSize: query.pageSize,
			totalItems,
			totalPages,
		};
	};
};
