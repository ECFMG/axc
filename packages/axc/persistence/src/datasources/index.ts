import { createReadonlyDataSource } from './readonly/index.ts';
export interface DataSources {
	readonlyDataSource: ReturnType<typeof createReadonlyDataSource>;
}
export interface DataSourcesFactory {
	withSystemPassport(): DataSources;
}
export const Persistence = (): DataSourcesFactory => ({ withSystemPassport: () => ({ readonlyDataSource: createReadonlyDataSource() }) });
