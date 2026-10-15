import type { Domain } from '@axc/domain';
import { type ReadonlyDataSource, ReadonlyDataSourceImplementation } from './readonly/index.ts';

export interface DataSources {
	readonlyDataSource: ReadonlyDataSource;
}

export interface DataSourcesFactory {
	create(): DataSources;
}

export const DataSourcesFactoryImpl = (courses: readonly Domain.Contexts.Catalog.Course.Course[]): DataSourcesFactory => {
	const dataSources: DataSources = { readonlyDataSource: ReadonlyDataSourceImplementation(courses) };
	return { create: () => dataSources };
};
