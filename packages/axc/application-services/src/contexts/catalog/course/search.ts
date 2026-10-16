import type { Domain } from '@axc/domain';

type DataSources = Domain.Contexts.Catalog.Course.DataSources;

export const search =
	(dataSources: DataSources) =>
	async (command: Domain.Contexts.Catalog.Course.CourseSearchCriteria): Promise<Domain.Contexts.Catalog.Course.CourseSearchResult> =>
		dataSources.readonlyDataSource.Catalog.Course.CourseReadRepository.search(command);
