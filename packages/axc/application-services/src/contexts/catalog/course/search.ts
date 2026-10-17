import type { Domain } from '@axc/domain';

type DataSources = Domain.Contexts.Catalog.Course.CatalogDataSources;
export const search =
	(dataSources: DataSources) =>
	async (command: Domain.Contexts.Catalog.Course.CourseSearchCriteria): Promise<Domain.Contexts.Catalog.Course.CourseSearchResult> => {
		return await dataSources.readonlyDataSource.Catalog.Course.search(command);
	};
