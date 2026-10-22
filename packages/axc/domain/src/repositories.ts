import type { Repository } from '@cellix/domain-seedwork/repository';
import type { Course } from './course.ts';
import type { EnrollmentRequest } from './enrollment-request.ts';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export interface CourseRepository extends DomainRepository<Course> {
	list(): Promise<readonly Course[]>;
}

export interface EnrollmentRequestRepository extends DomainRepository<EnrollmentRequest> {
	list(): Promise<readonly EnrollmentRequest[]>;
	allocateId(): string;
}
