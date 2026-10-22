import type { CourseReadRepository } from './course/course.read-repository.ts';
import type { EnrollmentRequestReadRepository } from './enrollment-request/enrollment-request.read-repository.ts';
export interface CatalogReadonly {
	Course: { CourseReadRepo: CourseReadRepository };
	EnrollmentRequest: { EnrollmentRequestReadRepo: EnrollmentRequestReadRepository };
}
