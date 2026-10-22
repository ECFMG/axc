import type { Domain } from '@axc/domain';
import type { ModelsContext } from '@axc/service-mongoose';
import { getEnrollmentRequestUnitOfWork } from './enrollment-request.uow.ts';

export const EnrollmentRequestPersistence = (models: ModelsContext, passport: Domain.Contexts.Passport) => ({
	EnrollmentRequestUnitOfWork: getEnrollmentRequestUnitOfWork(models.EnrollmentRequest, passport),
});
