import type { DataSources } from '@axc/persistence';
import { type CourseSearchQuery, type CourseSearchResult, search } from './search.ts';

export type { CourseSearchQuery, CourseSearchResult } from './search.ts';
export interface CourseApplicationService {
	search(query: CourseSearchQuery): Promise<CourseSearchResult>;
}
export const Course = (dataSources: DataSources): CourseApplicationService => ({ search: search(dataSources) });
