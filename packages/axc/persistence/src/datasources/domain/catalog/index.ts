import type { Catalog } from '@axc/domain';
import type { Store } from '../../store.ts';
import { EnrollmentRequestPersistence } from './enrollment-request/index.ts';
export const CatalogDomain = (store: Store): { EnrollmentRequest: { EnrollmentRequestUnitOfWork: Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork } } => ({ EnrollmentRequest: EnrollmentRequestPersistence(store) });
