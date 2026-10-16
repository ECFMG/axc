import type { Domain } from '@axc/domain';
import type { ModelsContext } from '@axc/persistence';
import { EnrollmentRequestReadRepositoryImpl } from './enrollment-request/index.ts';

export const EnrollmentContext = (models: ModelsContext, passport: Domain.Passport) => ({
	EnrollmentRequest: EnrollmentRequestReadRepositoryImpl(models, passport),
});
