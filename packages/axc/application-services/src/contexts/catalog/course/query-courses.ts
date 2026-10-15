import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';

interface CourseSearchPage extends Domain.Contexts.Catalog.Course.CourseSearchResult {
	readonly page: number;
	readonly pageSize: number;
	readonly totalPages: number;
}

export const queryCourses = (dataSources: DataSources) => {
	return async (criteria: Domain.Contexts.Catalog.Course.CourseSearchCriteria): Promise<CourseSearchPage> => {
		const result = await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(criteria);
		return { ...result, page: criteria.page, pageSize: criteria.pageSize, totalPages: Math.ceil(result.totalItems / criteria.pageSize) };
	};
};
