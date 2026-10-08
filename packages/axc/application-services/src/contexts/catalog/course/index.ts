import type { DataSources } from '@axc/persistence';
import { type CourseSearchQuery, type CourseSearchResult, queryCourses } from './query-courses.ts';

export type { CourseSearchQuery, CourseSearchResult, QueryParameterErrorDetail } from './query-courses.ts';
export { InvalidQueryParameterError } from './query-courses.ts';

export interface CourseApplicationService {
	search: (query: CourseSearchQuery) => Promise<CourseSearchResult>;
}

export const Course = (dataSources: DataSources): CourseApplicationService => {
	return {
		search: queryCourses(dataSources),
	};
};
