import type { Catalog } from '@axc/domain';
import type { Store } from '../store.ts';
import { CatalogDomain } from './catalog/index.ts';
export const DomainDataSourceImplementation = (store: Store): { Catalog: { EnrollmentRequest: { EnrollmentRequestUnitOfWork: Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork } } } => ({ Catalog: CatalogDomain(store) });
