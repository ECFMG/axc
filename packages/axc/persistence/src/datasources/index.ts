import type { Domain } from '@axc/domain';
import { type ReadonlyDataSource, ReadonlyDataSourceImplementation } from './readonly/index.ts';

export type DataSources = {
	readonlyDataSource: ReadonlyDataSource;
};

export const DataSourcesFactoryImpl = (courses: readonly Domain.Contexts.Catalog.Course.Course[]): DataSources => ({
	readonlyDataSource: ReadonlyDataSourceImplementation(courses),
});
