import type { Course, EnrollmentRequestRepository } from '@axc/domain';
import { createEnrollmentRequest, type EnrollmentRequestListOutcome, type EnrollmentRequestOutcome, getEnrollmentRequest, listEnrollmentRequests, updateEnrollmentRequestStatus } from './enrollment-requests.ts';
import { type CourseSearchOutcome, searchCourses } from './search-courses.ts';

export type { EnrollmentRequestError, EnrollmentRequestErrorCode, EnrollmentRequestErrorDetail, EnrollmentRequestFailure, EnrollmentRequestListOutcome, EnrollmentRequestOutcome } from './enrollment-requests.ts';
export { ENROLLMENT_REQUEST_ERROR_CODES, malformedEnrollmentRequestBody } from './enrollment-requests.ts';
export type { CourseQueryDetail, CourseSearchOutcome, InvalidCourseQuery } from './search-courses.ts';

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
		search(query: Readonly<Record<string, readonly string[]>>): CourseSearchOutcome;
	};
	enrollmentRequests: {
		create(body: unknown): EnrollmentRequestOutcome;
		getById(id: string): EnrollmentRequestOutcome;
		list(query: Readonly<Record<string, readonly string[]>>): EnrollmentRequestListOutcome;
		updateStatus(id: string, body: unknown): EnrollmentRequestOutcome;
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

export function buildApplicationServicesFactory(context: ApiContext, courses: readonly Course[], enrollmentRequests: EnrollmentRequestRepository, now: () => string = () => new Date().toISOString()): ApplicationServicesFactory {
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
				search(query: Readonly<Record<string, readonly string[]>>): CourseSearchOutcome {
					return searchCourses(courses, query);
				},
			},
			enrollmentRequests: {
				create(body: unknown): EnrollmentRequestOutcome {
					return createEnrollmentRequest(courses, enrollmentRequests, body, now);
				},
				getById(id: string): EnrollmentRequestOutcome {
					return getEnrollmentRequest(enrollmentRequests, id);
				},
				list(query: Readonly<Record<string, readonly string[]>>): EnrollmentRequestListOutcome {
					return listEnrollmentRequests(enrollmentRequests, query);
				},
				updateStatus(id: string, body: unknown): EnrollmentRequestOutcome {
					return updateEnrollmentRequestStatus(enrollmentRequests, id, body, now);
				},
			},
		});

	return { forRequest };
}
