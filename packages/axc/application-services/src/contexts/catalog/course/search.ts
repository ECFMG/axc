import type { CourseSearchQuery, DataSources } from '@axc/persistence';

export const search = (dataSources: DataSources) => (query: CourseSearchQuery) => dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(query);
