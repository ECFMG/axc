import type { Domain } from '@axc/domain';
import { Readonly } from './datasources/index.ts';
export interface DataSources {
	readonlyDataSource: {
		Catalog: { Course: { CourseReadRepo: Domain.Contexts.Catalog.Course.CourseReadRepository } };
	};
}
export function DataSourcesFactoryImpl(courses: readonly Domain.Contexts.Catalog.Course.Course[]): DataSources {
	return { readonlyDataSource: { Catalog: { Course: { CourseReadRepo: Readonly.Catalog.Course.getCourseReadRepository(courses) } } } };
}
