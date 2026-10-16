import type { Domain } from '@axc/domain';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { getCourseReadRepository, getEnrollmentRequestReadRepository, getEnrollmentRequestUnitOfWork } from './datasources/index.ts';
import { CourseModelFactory, CourseModelName, EnrollmentRequestModelFactory, EnrollmentRequestModelName } from './models/index.ts';

export { seedCourses } from './seed/index.ts';
export interface DataSources {
	readonlyDataSource: { Training: { Course: Domain.Contexts.Training.Course.CourseReadRepository; EnrollmentRequest: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestReadRepository } };
	domainDataSource: { Training: { EnrollmentRequest: { EnrollmentRequestUnitOfWork: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork<Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestProps> } } };
}
export const DataSourcesFactoryImpl = (models: { Course: ReturnType<typeof CourseModelFactory>; EnrollmentRequest: ReturnType<typeof EnrollmentRequestModelFactory> }, passport: Domain.Contexts.Passport): DataSources => ({
	readonlyDataSource: { Training: { Course: getCourseReadRepository(models.Course), EnrollmentRequest: getEnrollmentRequestReadRepository(models.EnrollmentRequest) } },
	domainDataSource: { Training: { EnrollmentRequest: { EnrollmentRequestUnitOfWork: getEnrollmentRequestUnitOfWork(models.EnrollmentRequest, passport) } } },
});
export const Persistence = (initializedService: MongooseSeedwork.MongooseContextFactory, passport: Domain.Contexts.Passport) => {
	const models = { [CourseModelName]: CourseModelFactory(initializedService), [EnrollmentRequestModelName]: EnrollmentRequestModelFactory(initializedService) };
	return {
		...DataSourcesFactoryImpl(models, passport),
		models,
		async initialize() {
			await models.Course.init();
			await models.EnrollmentRequest.init();
		},
	};
};
export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';
