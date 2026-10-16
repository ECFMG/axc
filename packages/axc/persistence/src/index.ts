import type { Domain } from '@axc/domain';
import type { Repository } from '@cellix/domain-seedwork/repository';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { getCourseReadRepository, getEnrollmentRequestReadRepository, getEnrollmentRequestUnitOfWork } from './datasources/index.ts';
import { CourseModelFactory, CourseModelName, EnrollmentRequestModelFactory, EnrollmentRequestModelName } from './models/index.ts';
import { sampleCourses } from './seed/index.ts';
/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;
export interface DataSources {
	readonlyDataSource: {
		Training: {
			Course: Domain.Contexts.Training.Course.CourseReadRepository;
			EnrollmentRequest: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestReadRepository;
		};
	};
	domainDataSource: {
		Training: { EnrollmentRequest: { EnrollmentRequestUnitOfWork: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestUnitOfWork } };
	};
}
export async function Persistence(initializedService: MongooseSeedwork.MongooseContextFactory, seedSampleData: boolean): Promise<DataSources> {
	const models = { [CourseModelName]: CourseModelFactory(initializedService), [EnrollmentRequestModelName]: EnrollmentRequestModelFactory(initializedService) };
	const course = models[CourseModelName];
	const enrollmentRequest = models[EnrollmentRequestModelName];
	await Promise.all([course.init(), enrollmentRequest.init()]);
	if (seedSampleData && (await course.countDocuments().exec()) === 0) {
		await course.insertMany(sampleCourses.map((record) => ({ record })));
	}
	return {
		readonlyDataSource: { Training: { Course: getCourseReadRepository(course), EnrollmentRequest: getEnrollmentRequestReadRepository(enrollmentRequest) } },
		domainDataSource: { Training: { EnrollmentRequest: { EnrollmentRequestUnitOfWork: getEnrollmentRequestUnitOfWork(enrollmentRequest) } } },
	};
}
