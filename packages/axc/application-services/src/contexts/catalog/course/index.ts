import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { type CourseSearchCommand, search } from './search.ts';

export interface CourseApplicationService {
	search: (command: CourseSearchCommand) => Promise<Domain.Contexts.Catalog.Course.CourseEntityReference[]>;
}

export const Course = (dataSources: DataSources): CourseApplicationService => {
	return {
		search: search(dataSources),
	};
};
