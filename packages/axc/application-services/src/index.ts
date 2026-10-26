import { courseSeed, InMemoryCourseRepository, InMemoryEnrollmentRequestRepository } from '@axc/persistence';
import { type CourseApplicationService, courseApplicationService } from './courses.ts';
import { type EnrollmentRequestApplicationService, enrollmentRequestApplicationService } from './enrollment-requests.ts';

export type { CourseEntityReference, EnrollmentRequestEntityReference, ErrorDetail } from '@axc/domain';
export { DomainError } from '@axc/domain';
export type { CourseSearchResult } from './courses.ts';

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
	courses: CourseApplicationService;
	enrollmentRequests: EnrollmentRequestApplicationService;
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
	// In-memory stores live for the factory's lifetime so state survives across requests.
	const courseRepository = new InMemoryCourseRepository(courseSeed);
	const courses = courseApplicationService(courseRepository);
	const enrollmentRequests = enrollmentRequestApplicationService(courseRepository, new InMemoryEnrollmentRequestRepository());
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
			courses,
			enrollmentRequests,
		});

	return { forRequest };
}
