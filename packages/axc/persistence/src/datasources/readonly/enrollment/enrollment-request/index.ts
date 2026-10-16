import type { Domain } from '@axc/domain';
import type { ModelsContext } from '@axc/persistence';
import { getEnrollmentRequestReadRepository } from './enrollment-request.read-repository.ts';

export type { EnrollmentRequestReadRepository } from './enrollment-request.read-repository.ts';

export const EnrollmentRequestReadRepositoryImpl = (models: ModelsContext, passport: Domain.Passport) => {
	return {
		EnrollmentRequestReadRepo: getEnrollmentRequestReadRepository(models, passport),
	};
};
