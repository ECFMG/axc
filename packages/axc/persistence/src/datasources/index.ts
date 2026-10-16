import type { EnrollmentRequestProps } from '@axc/domain';
import { type DomainDataSource, DomainDataSourceImplementation } from './domain/index.ts';
import { type ReadonlyDataSource, ReadonlyDataSourceImplementation } from './readonly/index.ts';
export interface DataSources {
	domainDataSource: DomainDataSource;
	readonlyDataSource: ReadonlyDataSource;
}
export interface DataSourcesFactory {
	forRequest(): DataSources;
}
export const DataSourcesFactoryImpl = (): DataSourcesFactory => {
	const records = new Map<string, EnrollmentRequestProps>();
	const sources = { domainDataSource: DomainDataSourceImplementation(records), readonlyDataSource: ReadonlyDataSourceImplementation(records) };
	return { forRequest: () => sources };
};
