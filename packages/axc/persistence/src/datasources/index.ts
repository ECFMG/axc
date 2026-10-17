import { DomainDataSourceImplementation } from './domain/index.ts';
import { ReadonlyDataSourceImplementation } from './readonly/index.ts';
import { createStore, type Store } from './store.ts';
export type DataSources = { readonlyDataSource: ReturnType<typeof ReadonlyDataSourceImplementation>; domainDataSource: ReturnType<typeof DomainDataSourceImplementation> };
export interface DataSourcesFactory {
	forRequest(): DataSources;
}
export const DataSourcesFactoryImpl = (store: Store = createStore()): DataSourcesFactory => ({
	forRequest: () => ({ readonlyDataSource: ReadonlyDataSourceImplementation(store), domainDataSource: DomainDataSourceImplementation(store) }),
});
