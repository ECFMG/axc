/** Repository ports the application layer depends on. Adapters live in `@axc/persistence`. */

import type { Repository } from '@cellix/domain-seedwork/repository';
import type { Course } from './course.ts';
import type { CourseSearchCriteria, CourseSearchResult } from './course-search.ts';
import type { EnrollmentRequest } from './enrollment-request.ts';
import type { EnrollmentRequestFilters } from './enrollment-request-commands.ts';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

/** Read model over the course catalog. */
export interface CourseRepository {
	/** Filters, sorts, and paginates the catalog. */
	search(criteria: CourseSearchCriteria): Promise<CourseSearchResult>;
	/** Resolves a single course, or `undefined` when no course carries the identifier. */
	findById(courseId: string): Promise<Course | undefined>;
}

/** Storage port for enrollment requests and their audit trails. */
export interface EnrollmentRequestRepository extends Pick<DomainRepository<EnrollmentRequest>, 'save'> {
	/** Allocates the next enrollment request identifier. */
	nextIdentity(): Promise<string>;
	/** Resolves a single request, or `undefined` when no request carries the identifier. */
	findById(id: string): Promise<EnrollmentRequest | undefined>;
	/** Lists requests matching the supplied filters, newest first. */
	findByFilters(filters: EnrollmentRequestFilters): Promise<readonly EnrollmentRequest[]>;
	/** Resolves the learner's existing pending or approved request for a course, when one exists. */
	findActiveForLearner(courseId: string, learnerEmail: string): Promise<EnrollmentRequest | undefined>;
}
