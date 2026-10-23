import type { Domain } from '@axc/domain';
import type { CourseReadRepository } from './catalog/course/index.ts';
import type { EnrollmentRequestReadRepository } from './catalog/enrollment-request/index.ts';
import { CatalogContext } from './catalog/index.ts';

type Course = Domain.Contexts.Catalog.Course.Course;
type EnrollmentRequestSnapshot = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot;

export interface ReadonlyDataSource {
	Catalog: {
		Course: {
			CourseReadRepo: CourseReadRepository;
		};
		EnrollmentRequest: {
			EnrollmentRequestReadRepo: EnrollmentRequestReadRepository;
		};
	};
}

export const ReadonlyDataSourceImplementation = (courses: readonly Course[], enrollmentRequests: EnrollmentRequestSnapshot[]): ReadonlyDataSource => ({
	Catalog: CatalogContext(courses, enrollmentRequests),
});
