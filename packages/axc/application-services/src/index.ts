/**
 * agentCourses application services.
 *
 * @remarks
 * Composes the request-scoped service graph handed to the delivery layer. Repository adapters
 * arrive through the infrastructure context built by the composition root, so this package
 * depends on the ports in `@axc/domain` rather than on any storage technology.
 */

import type { AxcDataSources } from '@axc/persistence';
import { type CourseSearchService, createCourseSearchService } from './course-search-service.ts';
import { createEnrollmentRequestService, type EnrollmentRequestService } from './enrollment-request-service.ts';
import { createHealthService, type HealthEnvironment, type HealthStatus } from './health.ts';

export type { CourseSearchService } from './course-search-service.ts';
export type { EnrollmentRequestService } from './enrollment-request-service.ts';
export type { HealthEnvironment, HealthStatus } from './health.ts';
export { HEALTH_PROJECT_CODE, HEALTH_SERVICE_NAME, resolveEnvironment } from './health.ts';

/** Infrastructure context built once at startup by `@apps/api`. */
export interface ApiContext {
	environment: HealthEnvironment;
	dataSources: AxcDataSources;
}

/** Request-scoped service graph available to the delivery layer. */
export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: CourseSearchService;
	enrollmentRequests: EnrollmentRequestService;
}

/** Produces the request-scoped service graph. */
export interface ApplicationServicesFactory {
	forRequest(rawAuthHeader?: string): Promise<ApplicationServices>;
}

/** Builds the application services factory from the infrastructure context. */
export function buildApplicationServicesFactory(context: ApiContext): ApplicationServicesFactory {
	const forRequest = (): Promise<ApplicationServices> =>
		Promise.resolve({
			health: createHealthService(context.environment),
			courses: createCourseSearchService(context.dataSources.courses),
			enrollmentRequests: createEnrollmentRequestService(context.dataSources.courses, context.dataSources.enrollmentRequests),
		});

	return { forRequest };
}
