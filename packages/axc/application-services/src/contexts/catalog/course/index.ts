import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { queryCourses } from './query-courses.ts';
export interface CourseApplicationService {
	queryCourses(query: Domain.Contexts.Catalog.CourseQuery): Promise<Domain.Contexts.Catalog.CourseResult>;
}
export const Course = (sources: DataSources): CourseApplicationService => ({ queryCourses: queryCourses(sources) });
