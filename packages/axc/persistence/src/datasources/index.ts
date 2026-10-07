import { type ReadonlyDataSource, ReadonlyDataSourceImplementation } from './readonly/index.ts';

export interface DataSources {
	readonlyDataSource: ReadonlyDataSource;
}

export interface DataSourcesFactory {
	withSystemPassport(): DataSources;
}

export const DataSourcesFactoryImpl = (): DataSourcesFactory => ({
	withSystemPassport: () => ({ readonlyDataSource: ReadonlyDataSourceImplementation() }),
});
