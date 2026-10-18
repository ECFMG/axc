import type { Domain } from '@axc/domain';
import type { ReadonlyDataSource } from './readonly/index.ts';
export interface DataSources {
	readonlyDataSource: ReadonlyDataSource;
	domainDataSource: { Catalog: { EnrollmentRequest: Domain.Contexts.Catalog.EnrollmentUnitOfWork } };
}
export interface DataSourcesFactory {
	withSystemPassport(): DataSources;
}
