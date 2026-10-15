import type { DataSources } from '@axc/persistence';
import { queryCourses } from './query-courses.ts';

export interface CourseApplicationService {
	queryCourses: ReturnType<typeof queryCourses>;
}

export const Course = (dataSources: DataSources): CourseApplicationService => ({
	queryCourses: queryCourses(dataSources),
});
