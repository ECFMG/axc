import { DomainDataSourceImplementation } from './domain/index.ts';
import { ReadonlyDataSourceImplementation } from './readonly/index.ts';
import { createStore } from './store.ts';
export const createDataSourcesFactory = () => {
	const store = createStore();
	const domainDataSource = DomainDataSourceImplementation(store);
	const readonlyDataSource = ReadonlyDataSourceImplementation(store);
	return { withPassport: () => ({ domainDataSource, readonlyDataSource }) };
};
export type DataSources = ReturnType<ReturnType<typeof createDataSourcesFactory>['withPassport']>;
export type DataSourcesFactory = ReturnType<typeof createDataSourcesFactory>;
