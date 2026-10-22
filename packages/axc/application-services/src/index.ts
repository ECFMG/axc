import type { EnrollmentRequest } from '@axc/domain';
import type { ApiContext, Clock, HealthEnvironment } from './api-context.ts';
import { type CoursePage, createCourseSearch } from './courses.ts';
import { createEnrollmentRequests, type EnrollmentRequestList } from './enrollment-requests.ts';
import { ApiError, invalidRequest, REQUEST_FAILURE_MESSAGE } from './errors.ts';
import type { QueryParameters } from './query.ts';

export const HEALTH_SERVICE_NAME = 'agentCourses-api' as const;
export const HEALTH_PROJECT_CODE = 'axc' as const;

export type { ApiContext, Clock, CoursePage, EnrollmentRequestList, HealthEnvironment, QueryParameters };
export { ApiError, invalidRequest, REQUEST_FAILURE_MESSAGE };

export interface HealthStatus {
	status: 'ok';
	service: typeof HEALTH_SERVICE_NAME;
	projectCode: typeof HEALTH_PROJECT_CODE;
	environment: HealthEnvironment;
	timestamp: string;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: {
		search(query: QueryParameters): CoursePage;
	};
	enrollmentRequests: {
		create(body: unknown): EnrollmentRequest;
		getById(id: string): EnrollmentRequest;
		list(query: QueryParameters): EnrollmentRequestList;
		updateStatus(id: string, body: unknown): EnrollmentRequest;
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
	const courses = createCourseSearch(context.catalog);
	const enrollmentRequests = createEnrollmentRequests(context.catalog, context.clock);
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
