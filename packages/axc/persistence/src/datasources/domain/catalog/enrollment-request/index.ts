import type { Domain } from '@axc/domain';
import { getEnrollmentRequestUnitOfWork } from './enrollment-request.memory-store.ts';

export type { EnrollmentRequestUnitOfWork } from './enrollment-request.memory-store.ts';

export const EnrollmentRequestPersistence = (records: Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot[]) => {
	return {
		EnrollmentRequestUnitOfWork: getEnrollmentRequestUnitOfWork(records),
	};
};
