import type { DataSources } from '@axc/persistence';
import { type CourseQueryCommand, query } from './query.ts';

export interface CourseApplicationService {
	query: ReturnType<typeof query>;
}

export const Course = (dataSources: DataSources): CourseApplicationService => {
	return {
		query: query(dataSources),
	};
};

export type { CourseQueryCommand };
