import type { ModelsContext } from '../models/index.ts';
import { Catalog } from './readonly/index.ts';
export interface DataSources {
	readonlyDataSource: { Catalog: { Course: { CourseReadRepo: Catalog.Course.CourseReadRepository } } };
}
export interface DataSourcesFactory {
	getDataSources(): DataSources;
}
export function DataSourcesFactoryImpl(models: ModelsContext): DataSourcesFactory {
	const dataSources: DataSources = {
		readonlyDataSource: { Catalog: { Course: { CourseReadRepo: Catalog.Course.getCourseReadRepository(models) } } },
	};
	return { getDataSources: () => dataSources };
}
