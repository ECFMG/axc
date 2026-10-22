import type { Domain } from '@axc/domain';
import type { ModelsContext } from '@axc/service-mongoose';
import { EnrollmentContextPersistence } from './enrollment/index.ts';

export const DomainDataSourceImplementation = (models: ModelsContext, passport: Domain.Contexts.Passport) => ({
	Enrollment: EnrollmentContextPersistence(models, passport),
});

export type DomainDataSource = ReturnType<typeof DomainDataSourceImplementation>;
