import type { Domain } from '@axc/domain';
import type { ModelsContext } from '@axc/persistence';
import type { CourseReadRepository } from './course/course/course.read-repository.ts';
import { CourseContext } from './course/index.ts';
import type { EnrollmentRequestReadRepository } from './enrollment/enrollment-request/enrollment-request.read-repository.ts';
import { EnrollmentContext } from './enrollment/index.ts';

export interface ReadonlyDataSource {
	Course: {
		Course: {
			CourseReadRepo: CourseReadRepository;
		};
	};
	Enrollment: {
		EnrollmentRequest: {
			EnrollmentRequestReadRepo: EnrollmentRequestReadRepository;
		};
	};
}

export const ReadonlyDataSourceImplementation = (models: ModelsContext, passport: Domain.Passport): ReadonlyDataSource => ({
	Course: CourseContext(models, passport),
	Enrollment: EnrollmentContext(models, passport),
});
