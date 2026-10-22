import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const queryCourses = (sources: DataSources) => (query: Domain.Contexts.Catalog.Course.CourseSearchQuery) => sources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(query);
