import type { DataSources } from '@axc/persistence';
import { type CoursePage, type CourseQueryCommand, queryCourses } from './query-courses.ts';

export type { CourseModality, CoursePage, CourseQueryCommand, CourseSortField, CourseStatus, CourseView } from './query-courses.ts';

export interface CourseApplicationService {
	queryCourses(command: CourseQueryCommand): Promise<CoursePage>;
}

export const Course = (dataSources: DataSources): CourseApplicationService => ({
	queryCourses: queryCourses(dataSources),
});
