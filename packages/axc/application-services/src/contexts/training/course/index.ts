import type { CourseSearchResult, DataSources } from '@axc/persistence';
import { type CourseSearchInput, search } from './search.ts';
export interface CourseApplicationService {
	search(input?: CourseSearchInput): Promise<CourseSearchResult>;
}
export const Course = (dataSources: DataSources): CourseApplicationService => ({ search: search(dataSources) });
