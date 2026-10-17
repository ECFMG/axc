import type { DataSources } from '@axc/persistence';
import { type CourseSearchQuery, type CourseSearchResult, list } from './list.ts';

export type { CourseSearchQuery, CourseSearchResult } from './list.ts';
export interface CourseApplicationService {
	list(query?: CourseSearchQuery): Promise<CourseSearchResult>;
}
export const Course = (dataSources: DataSources): CourseApplicationService => ({ list: list(dataSources) });
