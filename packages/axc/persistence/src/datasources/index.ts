import { ReadonlyDataSource } from './readonly/index.ts';
export interface DataSources {
	readonlyDataSource: ReturnType<typeof ReadonlyDataSource>;
}
export interface DataSourcesFactory {
	withSystemPassport(): DataSources;
}
export const Persistence = (): DataSourcesFactory => ({ withSystemPassport: () => ({ readonlyDataSource: ReadonlyDataSource() }) });
