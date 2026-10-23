import type { Course } from './course.ts';
import type { EnrollmentRequest } from './enrollment-request.ts';

/** In-memory catalog used by application services. Implementations live outside the domain. */
export interface CatalogStore {
	listCourses(): readonly Course[];
	findCourseById(id: string): Course | undefined;
	listEnrollmentRequests(): readonly EnrollmentRequest[];
	findEnrollmentRequestById(id: string): EnrollmentRequest | undefined;
	addEnrollmentRequest(request: EnrollmentRequest): void;
	replaceEnrollmentRequest(request: EnrollmentRequest): void;
	now(): string;
	nextEnrollmentId(): string;
}
