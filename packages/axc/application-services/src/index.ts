import { type CourseReadRepository, createInMemoryCourseReadRepository, createInMemoryEnrollmentRequestRepository, type EnrollmentRequestRepository } from '@axc/persistence';
import { type CourseSearchInput, type CourseSearchOutcome, searchCourses } from './courses.ts';
import { createEnrollmentRequestService, type EnrollmentRequestService } from './enrollment-requests.ts';

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
		search(input: CourseSearchInput): CourseSearchOutcome;
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

export function buildApplicationServicesFactory(
	context: ApiContext,
	catalog: CourseReadRepository = createInMemoryCourseReadRepository(),
	enrollmentRequestStore: EnrollmentRequestRepository = createInMemoryEnrollmentRequestRepository(),
): ApplicationServicesFactory {
	const enrollmentRequests = createEnrollmentRequestService(catalog, enrollmentRequestStore);

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
				search(input: CourseSearchInput): CourseSearchOutcome {
					return searchCourses(catalog, input);
				},
			},
			enrollmentRequests,
		});

	return { forRequest };
}

export type { CourseSearchInput, CourseSearchOutcome, CourseSearchPage, InvalidQueryError } from './courses.ts';
export {
	COURSE_SORT_FIELDS,
	DEFAULT_COURSE_PAGE,
	DEFAULT_COURSE_PAGE_SIZE,
	INVALID_QUERY_PARAMETER_CODE,
	INVALID_QUERY_PARAMETER_MESSAGE,
	MAX_COURSE_PAGE_SIZE,
	searchCourses,
} from './courses.ts';
export type { EnrollmentRequestError, EnrollmentRequestListQuery, EnrollmentRequestListResult, EnrollmentRequestOutcome, EnrollmentRequestService } from './enrollment-requests.ts';
export {
	COURSE_NOT_ACTIVE_CODE,
	COURSE_NOT_FOUND_CODE,
	createEnrollmentRequestService,
	DUPLICATE_ACTIVE_REQUEST_CODE,
	ENROLLMENT_REQUEST_NOT_FOUND_CODE,
	INVALID_REQUEST_CODE,
	INVALID_REQUEST_MESSAGE,
	INVALID_STATUS_TRANSITION_CODE,
} from './enrollment-requests.ts';
