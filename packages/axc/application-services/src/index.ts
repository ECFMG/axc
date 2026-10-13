import { InMemoryCourseRepository, InMemoryEnrollmentRequestRepository } from '@axc/persistence';
import { type CourseSearchResult, searchCourses } from './courses.ts';
import { type EnrollmentRequestService, enrollmentRequestService } from './enrollment-requests.ts';

export { DomainError } from '@axc/domain';
export type { CourseSearchResult } from './courses.ts';
export type { EnrollmentRequestService } from './enrollment-requests.ts';

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
		search(query: Record<string, string | undefined>): Promise<CourseSearchResult>;
	};
	enrollmentRequests: EnrollmentRequestService;
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
	// In-memory stores live for the process, so state survives across requests.
	const courses = new InMemoryCourseRepository();
	const enrollmentRequests = enrollmentRequestService(courses, new InMemoryEnrollmentRequestRepository());
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
			courses: { search: (query) => searchCourses(courses, query) },
			enrollmentRequests,
		});

	return { forRequest };
}
