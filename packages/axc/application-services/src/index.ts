import type { CourseRepository, EnrollmentRequest, EnrollmentRequestRepository } from '@axc/domain';
import { type CoursePage, searchCourses } from './courses.ts';
import { createEnrollmentRequest, type EnrollmentContext, type EnrollmentRequestList, getEnrollmentRequest, listEnrollmentRequests, updateEnrollmentStatus } from './enrollment-requests.ts';
import type { ServiceResult } from './service-result.ts';

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

export interface ApplicationDependencies {
	courses: CourseRepository;
	enrollmentRequests: EnrollmentRequestRepository;
	now?: () => string;
	createEnrollmentId?: () => string;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: {
		search(query: Readonly<Record<string, string>>): Promise<ServiceResult<CoursePage>>;
	};
	enrollmentRequests: {
		create(body: unknown): Promise<ServiceResult<EnrollmentRequest>>;
		getById(id: string): Promise<ServiceResult<EnrollmentRequest>>;
		list(query: Readonly<Record<string, string>>): Promise<ServiceResult<EnrollmentRequestList>>;
		updateStatus(id: string, body: unknown): Promise<ServiceResult<EnrollmentRequest>>;
	};
}

export interface ApplicationServicesFactory {
	forRequest(rawAuthHeader?: string): Promise<ApplicationServices>;
}

export type { CoursePage } from './courses.ts';
export type { EnrollmentRequestList } from './enrollment-requests.ts';
export type { FieldError, ServiceError, ServiceErrorCode, ServiceResult } from './service-result.ts';

export function resolveEnvironment(nodeEnv: string | undefined): HealthEnvironment {
	if (nodeEnv === 'production') {
		return 'production';
	}
	if (nodeEnv === 'test') {
		return 'test';
	}
	return 'local';
}

export function buildApplicationServicesFactory(context: ApiContext, dependencies: ApplicationDependencies): ApplicationServicesFactory {
	const enrollment = enrollmentContext(dependencies);
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
				search(query) {
					return searchCourses(dependencies.courses, query);
				},
			},
			enrollmentRequests: {
				create(body) {
					return createEnrollmentRequest(enrollment, body);
				},
				getById(id) {
					return getEnrollmentRequest(enrollment, id);
				},
				list(query) {
					return listEnrollmentRequests(enrollment, query);
				},
				updateStatus(id, body) {
					return updateEnrollmentStatus(enrollment, id, body);
				},
			},
		});

	return { forRequest };
}

function enrollmentContext(dependencies: ApplicationDependencies): EnrollmentContext {
	return {
		courses: dependencies.courses,
		enrollmentRequests: dependencies.enrollmentRequests,
		now: dependencies.now ?? (() => new Date().toISOString()),
		createEnrollmentId: dependencies.createEnrollmentId ?? defaultEnrollmentIds(),
	};
}

function defaultEnrollmentIds(): () => string {
	let sequence = 0;
	return () => {
		sequence += 1;
		// shortcut: ids restart at enroll-001 on process start, switch to a durable id when a persistent store is added
		return `enroll-${String(sequence).padStart(3, '0')}`;
	};
}
