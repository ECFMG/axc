import { type ReadonlyDataSource, ReadonlyDataSourceImplementation } from './readonly/index.ts';

export interface DataSources {
	readonlyDataSource: ReadonlyDataSource;
}

export interface DataSourcesFactory {
	forRequest(): DataSources;
}

export const DataSourcesFactoryImpl = (): DataSourcesFactory => ({
	forRequest: () => ({ readonlyDataSource: ReadonlyDataSourceImplementation() }),
});
