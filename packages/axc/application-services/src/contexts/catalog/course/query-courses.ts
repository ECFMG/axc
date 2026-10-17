import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const queryCourses = (dataSources: DataSources) => async (query: Domain.Contexts.Catalog.Course.CourseSearchQuery) => dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(query);
