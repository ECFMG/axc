import type { Domain } from '@axc/domain';
import { EnrollmentRequestPersistence } from './enrollment-request/index.ts';

export const CatalogDomainContext = (records: Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot[]) => ({
	EnrollmentRequest: EnrollmentRequestPersistence(records),
});
