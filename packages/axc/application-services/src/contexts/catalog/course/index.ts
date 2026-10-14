import type { DataSources } from '@axc/persistence';
import { type CourseSearchQuery, type CourseSearchResult, querySearch } from './query-search.ts';

export { type CourseSearchQuery, type CourseSearchResult, InvalidQueryParameterError } from './query-search.ts';

export interface CourseApplicationService {
	search: (query: CourseSearchQuery) => Promise<CourseSearchResult>;
}

export const Course = (dataSources: DataSources): CourseApplicationService => ({
	search: querySearch(dataSources),
});
