import type { CourseSearchQuery, CourseSearchResult, DataSources } from '@axc/persistence';

export const search =
	(dataSources: DataSources) =>
	async (query: CourseSearchQuery): Promise<CourseSearchResult> =>
		await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(query);
