import type { Domain } from '@axc/domain';
import type { ModelsContext } from '@axc/service-mongoose';
import { EnrollmentRequestPersistence } from './enrollment-request/index.ts';

export const EnrollmentContextPersistence = (models: ModelsContext, passport: Domain.Contexts.Passport) => ({
	EnrollmentRequest: EnrollmentRequestPersistence(models, passport),
});
