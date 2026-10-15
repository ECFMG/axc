import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const queryCourses = (dataSources: DataSources) => {
	return async (criteria: Domain.Contexts.Catalog.Course.CourseSearchCriteria): Promise<Domain.Contexts.Catalog.Course.CourseSearchResult> => {
		return await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(criteria);
	};
};
