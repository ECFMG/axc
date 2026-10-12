/**
 * agentCourses persistence layer.
 *
 * @remarks
 * Supplies the repository adapters the composition root injects into the application services.
 * The scaffold has no provisioned database, so the shipped adapters keep the catalog and the
 * enrollment request workflow in process memory. Replacing them with Mongoose-backed adapters is
 * a change to this package only; the ports in `@axc/domain` and every consumer stay untouched.
 */

import type { CourseRepository, EnrollmentRequestRepository } from '@axc/domain';
import { createInMemoryCourseRepository } from './in-memory-course-repository.ts';
import { createInMemoryEnrollmentRequestRepository } from './in-memory-enrollment-request-repository.ts';

export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';
export { SEED_COURSES } from './course-seed.ts';
export { createInMemoryCourseRepository } from './in-memory-course-repository.ts';
export { createInMemoryEnrollmentRequestRepository } from './in-memory-enrollment-request-repository.ts';

/** Repository adapters handed to the application services by the composition root. */
export interface AxcDataSources {
	readonly courses: CourseRepository;
	readonly enrollmentRequests: EnrollmentRequestRepository;
}

/** Builds the in-memory data sources used for local development, tests, and the sample runtime. */
export function createInMemoryDataSources(): AxcDataSources {
	return {
		courses: createInMemoryCourseRepository(),
		enrollmentRequests: createInMemoryEnrollmentRequestRepository(),
	};
}
