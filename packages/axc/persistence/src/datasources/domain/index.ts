import type { Domain, DomainDataSource } from '@axc/domain';
import type { ModelsContext } from '@axc/persistence';
import { CourseContextPersistence } from './course/index.ts';
import { EnrollmentContextPersistence } from './enrollment/index.ts';

export const DomainDataSourceImplementation = (models: ModelsContext, passport: Domain.Passport): DomainDataSource => ({
	Course: CourseContextPersistence(models, passport),
	Enrollment: EnrollmentContextPersistence(models, passport),
});
