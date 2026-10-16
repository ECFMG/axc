import type { DataSources } from '@axc/persistence';
import { queryCourses } from './query-courses.ts';

interface CourseServices {
	queryCourses: ReturnType<typeof queryCourses>;
}
export const Course = (dataSources: DataSources): CourseServices => ({ queryCourses: queryCourses(dataSources) });
