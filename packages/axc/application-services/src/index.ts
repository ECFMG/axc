import { type CourseList, type CoursesQuery, listCourses } from './courses.ts';
import { createEnrollmentRequestStore } from './enrollment-requests.store.ts';
import type { CreateEnrollmentRequestInput, EnrollmentRequest, EnrollmentRequestsQuery, UpdateEnrollmentRequestStatusInput } from './enrollment-requests.ts';

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
		list(q: CoursesQuery): CourseList;
	};
	enrollmentRequests: {
		list(q: EnrollmentRequestsQuery): EnrollmentRequest[];
		create(input: CreateEnrollmentRequestInput): EnrollmentRequest;
		getById(id: string): EnrollmentRequest;
		updateStatus(id: string, input: UpdateEnrollmentRequestStatusInput): EnrollmentRequest;
	};
}

export interface ApplicationServicesFactory {
	forRequest(rawAuthHeader?: string): Promise<ApplicationServices>;
}

export { type Course, type CourseList, type CoursesQuery, courseModalities, courseSorts, courseStatuses, isCourseModality, isCourseSort, isCourseStatus } from './courses.ts';
export { EnrollmentRequestError, type EnrollmentRequestErrorCode } from './enrollment-requests.store.ts';
export {
	type CreateEnrollmentRequestInput,
	type EnrollmentRequest,
	type EnrollmentRequestStatus,
	type EnrollmentRequestsQuery,
	enrollmentRequestStatuses,
	isEnrollmentRequestStatus,
	isValidEmail,
	isValidJustification,
	type StatusHistoryEntry,
	type UpdateEnrollmentRequestStatusInput,
} from './enrollment-requests.ts';

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
	const enrollmentRequestStore = createEnrollmentRequestStore();
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
			courses: { list: listCourses },
			enrollmentRequests: {
				list: enrollmentRequestStore.list,
				create: enrollmentRequestStore.create,
				getById: enrollmentRequestStore.getById,
				updateStatus: enrollmentRequestStore.updateStatus,
			},
		});

	return { forRequest };
}
