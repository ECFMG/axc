import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export function queryCourses(dataSources: DataSources) {
	return async (criteria: Domain.Contexts.Catalog.Course.CourseSearchCriteria): Promise<Domain.Contexts.Catalog.Course.CoursePage> => {
		const result = await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(criteria);
		return { ...result, page: criteria.page, pageSize: criteria.pageSize, totalPages: Math.ceil(result.totalItems / criteria.pageSize) };
	};
}
