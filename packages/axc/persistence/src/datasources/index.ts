import type { Catalog } from '@axc/domain';
import { createEnrollmentRequestUnitOfWork } from './domain/catalog/enrollment-request/enrollment-request.uow.ts';
import { courseFixtures } from './readonly/catalog/course/course.data.ts';
import { type CourseReadRepository, createCourseReadRepository } from './readonly/catalog/course/course.read-repository.ts';
import { createEnrollmentRequestReadRepository, type EnrollmentRequestReadRepository } from './readonly/catalog/enrollment-request/enrollment-request.read-repository.ts';

export interface DataSources {
	readonlyDataSource: { Catalog: { Course: { CourseReadRepo: CourseReadRepository }; EnrollmentRequest: { EnrollmentRequestReadRepo: EnrollmentRequestReadRepository } } };
	domainDataSource: { Catalog: { EnrollmentRequest: { EnrollmentRequestUnitOfWork: Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork } } };
}

export interface DataSourcesFactory {
	create(): DataSources;
}

export function createDataSourcesFactory(): DataSourcesFactory {
	const requests = new Map<string, Catalog.EnrollmentRequest.EnrollmentRequest>();
	const courses = courseFixtures();
	const unitOfWork = createEnrollmentRequestUnitOfWork(requests);
	return {
		create: () => ({
			readonlyDataSource: { Catalog: { Course: { CourseReadRepo: createCourseReadRepository(courses) }, EnrollmentRequest: { EnrollmentRequestReadRepo: createEnrollmentRequestReadRepository(requests) } } },
			domainDataSource: { Catalog: { EnrollmentRequest: { EnrollmentRequestUnitOfWork: unitOfWork } } },
		}),
	};
}
