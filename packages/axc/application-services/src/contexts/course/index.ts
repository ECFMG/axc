import type { DataSources } from '@axc/persistence';
import { Course as CourseApi, type CourseApplicationService } from './course/index.ts';

export interface CourseContextApplicationService {
	Course: CourseApplicationService;
}

export const Course = (dataSources: DataSources): CourseContextApplicationService => {
	return {
		Course: CourseApi(dataSources),
	};
};
