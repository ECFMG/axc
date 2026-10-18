import { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
export const queryCourses = (dataSources: DataSources) => async (input: Record<string, unknown>) => dataSources.readonlyDataSource.Catalog.Course.CourseReadRepo.search(Domain.Contexts.Catalog.Course.parseSearchQuery(input));
