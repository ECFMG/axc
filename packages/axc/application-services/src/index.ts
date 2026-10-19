import type { CourseRepository, EnrollmentRequest, EnrollmentRequestRepository } from '@axc/domain';
import { type CoursePage, createEnrollmentRequest, getEnrollmentRequest, listEnrollmentRequests, searchCourses, updateEnrollmentStatus } from './catalog.ts';

export { CatalogError, type CatalogErrorCode, type CatalogErrorDetail, type CoursePage } from './catalog.ts';

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
	courses: CourseRepository;
	enrollmentRequests: EnrollmentRequestRepository;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: {
		search(query: Readonly<Record<string, string | undefined>>): Promise<CoursePage>;
	};
	enrollmentRequests: {
		create(input: unknown): Promise<EnrollmentRequest>;
		getById(id: string): Promise<EnrollmentRequest>;
		list(query: Readonly<Record<string, string | undefined>>): Promise<readonly EnrollmentRequest[]>;
		updateStatus(id: string, input: unknown): Promise<EnrollmentRequest>;
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
				search(query: Readonly<Record<string, string | undefined>>): Promise<CoursePage> {
					return searchCourses(context.courses, query);
				},
			},
			enrollmentRequests: {
				create(input: unknown): Promise<EnrollmentRequest> {
					return createEnrollmentRequest(context.enrollmentRequests, context.courses, input);
				},
				getById(id: string): Promise<EnrollmentRequest> {
					return getEnrollmentRequest(context.enrollmentRequests, id);
				},
				list(query: Readonly<Record<string, string | undefined>>): Promise<readonly EnrollmentRequest[]> {
					return listEnrollmentRequests(context.enrollmentRequests, query);
				},
				updateStatus(id: string, input: unknown): Promise<EnrollmentRequest> {
					return updateEnrollmentStatus(context.enrollmentRequests, id, input);
				},
			},
		});

	return { forRequest };
}
