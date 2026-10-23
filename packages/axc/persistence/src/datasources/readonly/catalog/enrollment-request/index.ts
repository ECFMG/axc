import type { Domain } from '@axc/domain';
import { getEnrollmentRequestReadRepository } from './enrollment-request.read-repository.ts';

export type { EnrollmentRequestReadRepository } from './enrollment-request.read-repository.ts';

export const EnrollmentRequestReadRepositoryImpl = (records: Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot[]) => {
	return {
		EnrollmentRequestReadRepo: getEnrollmentRequestReadRepository(records),
	};
};
