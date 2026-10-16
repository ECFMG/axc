import type { Domain } from '@axc/domain';
import { Catalog } from './readonly/index.ts';
export interface DataSources {
	readonlyDataSource: { Catalog: { Course: { CourseReadRepo: Catalog.Course.CourseReadRepository } } };
}
export interface DataSourcesFactory {
	create(): DataSources;
}
export function DataSourcesFactoryImpl(courses: readonly Domain.Contexts.Catalog.Course.Course[]): DataSourcesFactory {
	const dataSources: DataSources = { readonlyDataSource: { Catalog: { Course: { CourseReadRepo: Catalog.Course.getCourseReadRepository(courses) } } } };
	return { create: () => dataSources };
}
