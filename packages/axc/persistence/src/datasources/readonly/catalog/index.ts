import type { Domain } from '@axc/domain';
import { CourseReadRepositoryImpl } from './course/index.ts';
import { EnrollmentRequestReadRepositoryImpl } from './enrollment-request/index.ts';

type Course = Domain.Contexts.Catalog.Course.Course;
type EnrollmentRequestSnapshot = Domain.Contexts.Catalog.EnrollmentRequest.EnrollmentRequestSnapshot;

export const CatalogContext = (courses: readonly Course[], enrollmentRequests: EnrollmentRequestSnapshot[]) => ({
	Course: CourseReadRepositoryImpl(courses),
	EnrollmentRequest: EnrollmentRequestReadRepositoryImpl(enrollmentRequests),
});
