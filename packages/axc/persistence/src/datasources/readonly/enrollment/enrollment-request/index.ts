import type { ModelsContext } from '@axc/service-mongoose';
import { EnrollmentRequestDataSource } from './enrollment-request.data.ts';
import { EnrollmentRequestReadRepositoryImpl } from './enrollment-request.read-repository.ts';

export type { EnrollmentRequestReadModel, EnrollmentRequestSearchCriteria } from './enrollment-request.read-repository.ts';

export const EnrollmentRequestReadonlyPersistence = (models: ModelsContext) => ({
	EnrollmentRequestReadRepo: new EnrollmentRequestReadRepositoryImpl(new EnrollmentRequestDataSource(models.EnrollmentRequest)),
});
