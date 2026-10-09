import { type DomainDataSource, DomainDataSourceImplementation } from './domain/index.ts';
import { type ReadonlyDataSource, ReadonlyDataSourceImplementation } from './readonly/index.ts';
import { createStore } from './store.ts';
export interface DataSources {
	domainDataSource: DomainDataSource;
	readonlyDataSource: ReadonlyDataSource;
	nextEnrollmentId(): string;
}
export interface DataSourcesFactory {
	withSystemPassport(): DataSources;
}
export const DataSourcesFactoryImpl = (): DataSourcesFactory => {
	const store = createStore();
	return {
		withSystemPassport: () => ({
			domainDataSource: DomainDataSourceImplementation(store),
			readonlyDataSource: ReadonlyDataSourceImplementation(store),
			nextEnrollmentId: () => `enroll-${String(store.nextId++).padStart(3, '0')}`,
		}),
	};
};
