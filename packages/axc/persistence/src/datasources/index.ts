import type { Domain } from '@axc/domain';
import { type ReadonlyDataSource, ReadonlyDataSourceImplementation } from './readonly/index.ts';

export * as Readonly from './readonly/index.ts';
export interface DataSources {
	readonlyDataSource: ReadonlyDataSource;
}
export interface DataSourcesFactory {
	forRequest(): DataSources;
}
export function DataSourcesFactoryImpl(courses: readonly Domain.Contexts.Catalog.Course.Course[]): DataSourcesFactory {
	const readonlyDataSource = ReadonlyDataSourceImplementation(courses);
	return { forRequest: () => ({ readonlyDataSource }) };
}
