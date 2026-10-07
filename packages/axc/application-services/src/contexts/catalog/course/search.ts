import type { CourseSearchQuery, DataSources } from '@axc/persistence';

export const search = (dataSources: DataSources) => async (query: CourseSearchQuery) => await dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(query);
