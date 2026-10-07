import type { CourseSearchQuery, CourseSearchResult, DataSources } from '@axc/persistence';
import { search } from './search.ts';

export interface CourseApplicationService {
	search(query: CourseSearchQuery): Promise<CourseSearchResult>;
}

export const Course = (dataSources: DataSources): CourseApplicationService => ({ search: search(dataSources) });
