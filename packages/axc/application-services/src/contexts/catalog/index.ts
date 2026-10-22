import type { DataSources } from '@axc/persistence';
import { Course, type CourseApplicationService } from './course/index.ts';

export type { CourseModality, CoursePage, CourseQueryCommand, CourseSortField, CourseStatus, CourseView } from './course/index.ts';

export interface CatalogContextApplicationService {
	Course: CourseApplicationService;
}

export const Catalog = (dataSources: DataSources): CatalogContextApplicationService => ({
	Course: Course(dataSources),
});
