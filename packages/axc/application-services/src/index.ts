import { InMemoryCourseRepository, InMemoryEnrollmentRequestRepository } from '@axc/persistence';
import { type CourseSearchResult, searchCourses } from './courses.ts';
import { type EnrollmentRequestDto, enrollmentRequestServices } from './enrollment-requests.ts';

export { DomainError } from '@axc/domain';
export type { CourseSearchResult } from './courses.ts';
export type { EnrollmentRequestDto } from './enrollment-requests.ts';

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
		search(query: Record<string, string>): Promise<CourseSearchResult>;
	};
	enrollmentRequests: {
		create(body: unknown): Promise<EnrollmentRequestDto>;
		getById(id: string): Promise<EnrollmentRequestDto>;
		list(query: Record<string, string>): Promise<EnrollmentRequestDto[]>;
		changeStatus(id: string, body: unknown): Promise<EnrollmentRequestDto>;
	};
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
	// In-memory sample data lives for the process lifetime, shared across requests.
	const courseRepository = new InMemoryCourseRepository();
	const courses = { search: searchCourses(courseRepository) };
	const enrollmentRequests = enrollmentRequestServices(courseRepository, new InMemoryEnrollmentRequestRepository());
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
