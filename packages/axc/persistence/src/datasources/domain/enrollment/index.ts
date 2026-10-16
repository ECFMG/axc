import type { Domain } from '@axc/domain';
import type { ModelsContext } from '@axc/persistence';
import * as EnrollmentRequest from './enrollment-request/index.ts';

export const EnrollmentContextPersistence = (models: ModelsContext, passport: Domain.Passport) => ({
	EnrollmentRequest: EnrollmentRequest.EnrollmentRequestPersistence(models, passport),
});
