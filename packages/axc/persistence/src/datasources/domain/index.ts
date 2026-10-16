import type { Domain } from '@axc/domain';
import type { EnrollmentRequestUnitOfWork } from './catalog/enrollment-request/index.ts';
import { CatalogDomainContext } from './catalog/index.ts';

export interface DomainDataSource {
	Catalog: {
		EnrollmentRequest: {
			EnrollmentRequestUnitOfWork: EnrollmentRequestUnitOfWork;
		};
	};
}

export const DomainDataSourceImplementation = (records: Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot[]): DomainDataSource => ({
	Catalog: CatalogDomainContext(records),
});
