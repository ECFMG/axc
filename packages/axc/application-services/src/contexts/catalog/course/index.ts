import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { queryCourses } from './query-courses.ts';
export interface CourseApplicationService {
	queryCourses(query: Domain.Contexts.Catalog.Course.CourseSearchQuery): Promise<Domain.Contexts.Catalog.Course.CourseSearchResult>;
}
export const Course = (sources: DataSources): CourseApplicationService => ({ queryCourses: queryCourses(sources) });
