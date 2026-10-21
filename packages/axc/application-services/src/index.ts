import type { EnrollmentRequest, EnrollmentRequestStore } from '@axc/domain';
import { createEnrollmentRequestStore, readCourseCatalog } from '@axc/persistence';
import type { EnrollmentRequestList, EnrollmentResult } from './enrollment-requests.ts';
import { createEnrollmentRequestService } from './enrollment-requests.ts';
import type { CourseListResult, CourseQueryInput } from './list-courses.ts';
import { listCourses } from './list-courses.ts';

export const HEALTH_SERVICE_NAME = 'agentCourses-api' as const;
export const HEALTH_PROJECT_CODE = 'axc' as const;

export type { ApiErrorBody, ApiErrorDetail } from './api-error.ts';
export { invalidRequestError } from './api-error.ts';
export type { EnrollmentRequestList, EnrollmentResult } from './enrollment-requests.ts';
export type { CourseListResult, CoursePage, CourseQueryError, CourseQueryErrorDetail, CourseQueryInput } from './list-courses.ts';

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

export interface ApplicationServicesOptions {
	now?: () => string;
	enrollmentRequestStore?: EnrollmentRequestStore;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: {
		list(query: CourseQueryInput): CourseListResult;
	};
	enrollmentRequests: {
		create(body: unknown): EnrollmentResult<EnrollmentRequest>;
		getById(id: string): EnrollmentResult<EnrollmentRequest>;
		list(query: CourseQueryInput): EnrollmentResult<EnrollmentRequestList>;
		updateStatus(id: string, body: unknown): EnrollmentResult<EnrollmentRequest>;
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

export function buildApplicationServicesFactory(context: ApiContext, options?: ApplicationServicesOptions): ApplicationServicesFactory {
	const courses = readCourseCatalog();
	const store = options?.enrollmentRequestStore ?? createEnrollmentRequestStore();
	const now = options?.now ?? ((): string => new Date().toISOString());
	const enrollmentRequests = createEnrollmentRequestService({ courses, store, now });
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
				list(query: CourseQueryInput): CourseListResult {
					return listCourses(courses, query);
				},
			},
			enrollmentRequests,
		});

	return { forRequest };
}
