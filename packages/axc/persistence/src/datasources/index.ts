import { createReadonlyDataSource, type ReadonlyDataSource } from './readonly/index.ts';
export interface DataSources {
	readonlyDataSource: ReadonlyDataSource;
}
export interface DataSourcesFactory {
	withSystemPassport(): DataSources;
}
export const Persistence = (): DataSourcesFactory => ({ withSystemPassport: () => ({ readonlyDataSource: createReadonlyDataSource() }) });
