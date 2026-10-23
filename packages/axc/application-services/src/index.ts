import { type CoursePage, type CourseQuery, listCourses } from './courses.ts';
import { createEnrollmentStore, type EnrollmentStore } from './enrollment-requests.store.ts';

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
		list(query: CourseQuery): CoursePage;
	};
	enrollmentRequests: EnrollmentStore;
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
	const enrollmentRequests = createEnrollmentStore();
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
				list: listCourses,
			},
			enrollmentRequests,
		});

	return { forRequest };
}

export type { Course, CourseModality, CoursePage, CourseQuery, CourseSort, CourseStatus } from './courses.ts';
export { courseModalities, courseSorts, courseStatuses, isCourseModality, isCourseSort, isCourseStatus } from './courses.ts';
export { isValidJustification, isValidLearnerEmail, JUSTIFICATION_MAX, JUSTIFICATION_MIN } from './enrollment-requests.rules.ts';
export type { EnrollmentErrorCode, EnrollmentStore } from './enrollment-requests.store.ts';
export { EnrollmentError } from './enrollment-requests.store.ts';
export type { ChangeEnrollmentStatusInput, CreateEnrollmentInput, EnrollmentListQuery, EnrollmentRequest, EnrollmentStatus, StatusHistoryEntry } from './enrollment-requests.ts';
export { enrollmentStatuses, isEnrollmentStatus } from './enrollment-requests.ts';
