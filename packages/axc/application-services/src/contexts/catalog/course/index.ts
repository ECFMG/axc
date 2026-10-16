import type { Domain } from '@axc/domain';
import { search } from './search.ts';

export interface CourseApplicationService {
	search(command: Domain.Contexts.Catalog.Course.CourseSearchCriteria): Promise<Domain.Contexts.Catalog.Course.CourseSearchResult>;
}

export const Course = (dataSources: Domain.Contexts.Catalog.Course.DataSources): CourseApplicationService => ({ search: search(dataSources) });
