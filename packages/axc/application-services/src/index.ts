import type { CourseSearchCriteria } from '@axc/domain';
import { type CoursePage, InMemoryCourseRepository, InMemoryEnrollmentRequestRepository } from '@axc/persistence';
import { parseCourseSearchCriteria, type RawQuery } from './course-search.ts';
import { buildEnrollmentRequestServices, type EnrollmentRequestServices } from './enrollment-requests.ts';

export const HEALTH_SERVICE_NAME = 'agentCourses-api' as const;
export const HEALTH_PROJECT_CODE = 'axc' as const;

export type HealthEnvironment = 'local' | 'test' | 'production';

export interface HealthStatus {
	status: 'ok';
	service: typeof HEALTH_SERVICE_NAME;
	projectCode: typeof HEALTH_PROJECT_CODE;
	environment: HealthEnvironment;
	timestamp: string;
}

export interface ApiContext {
	environment: HealthEnvironment;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: {
		search(query: RawQuery): Promise<CoursePage>;
	};
	enrollmentRequests: EnrollmentRequestServices;
}

export interface ApplicationServicesFactory {
	forRequest(rawAuthHeader?: string): Promise<ApplicationServices>;
}

export function resolveEnvironment(nodeEnv: string | undefined): HealthEnvironment {
	if (nodeEnv === 'production') {
		return 'production';
	}
	if (nodeEnv === 'test') {
		return 'test';
	}
	return 'local';
}

export function buildApplicationServicesFactory(context: ApiContext): ApplicationServicesFactory {
	// Repositories are created once per host process: the in-memory store is the sample app's database.
	const courseRepository = new InMemoryCourseRepository();
	const enrollmentRequestRepository = new InMemoryEnrollmentRequestRepository();
	const enrollmentRequests = buildEnrollmentRequestServices(courseRepository, enrollmentRequestRepository);

	const forRequest = (): Promise<ApplicationServices> =>
		Promise.resolve({
			health: {
				getStatus(): HealthStatus {
					return {
						status: 'ok',
						service: HEALTH_SERVICE_NAME,
						projectCode: HEALTH_PROJECT_CODE,
						environment: context.environment,
						timestamp: new Date().toISOString(),
					};
				},
			},
			courses: {
				search(query: RawQuery): Promise<CoursePage> {
					const criteria: CourseSearchCriteria = parseCourseSearchCriteria(query);
					return courseRepository.search(criteria);
				},
			},
			enrollmentRequests,
		});

	return { forRequest };
}

export type { CoursePage } from '@axc/persistence';
export { maxPageSize, parseCourseSearchCriteria, type RawQuery } from './course-search.ts';
export type { EnrollmentRequestServices } from './enrollment-requests.ts';
export { ServiceError, type ServiceErrorCode, type ServiceErrorDetail, serviceErrorStatuses } from './errors.ts';
