import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { queryCourses } from './query-courses.ts';
export interface CourseApplicationService {
	queryCourses(criteria: Domain.Contexts.Catalog.Course.CourseSearchCriteria): Promise<Domain.Contexts.Catalog.Course.CourseSearchResult>;
}
export const Course = (dataSources: DataSources): CourseApplicationService => ({ queryCourses: queryCourses(dataSources) });
