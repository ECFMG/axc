import type { CoursePage, CourseSearchQuery, DataSources } from '@axc/persistence';
import { search } from './search.ts';

export interface CourseApplicationService {
	search(query: CourseSearchQuery): Promise<CoursePage>;
}

export const Course = (dataSources: DataSources): CourseApplicationService => ({
	search: search(dataSources),
});
