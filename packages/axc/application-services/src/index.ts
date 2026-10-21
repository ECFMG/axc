import type { CoursePage, CourseRepository, EnrollmentRequestRepository } from '@axc/domain';
import { searchCourses } from './courses.ts';
import { createEnrollmentRequestServices, type EnrollmentRequestServices } from './enrollment-requests.ts';
import type { AppResult } from './result.ts';

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

export interface CatalogDependencies {
	courses: CourseRepository;
	enrollmentRequests: EnrollmentRequestRepository;
	now?: () => string;
	nextEnrollmentId?: () => string;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: {
		search(query: Record<string, string | undefined>): Promise<AppResult<CoursePage>>;
	};
	enrollmentRequests: EnrollmentRequestServices;
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

export function buildApplicationServicesFactory(context: ApiContext, dependencies: CatalogDependencies): ApplicationServicesFactory {
	const now = dependencies.now ?? (() => new Date().toISOString());
	let sequence = 1;
	const nextEnrollmentId =
		dependencies.nextEnrollmentId ??
		(() => {
			const id = `enroll-${String(sequence).padStart(3, '0')}`;
			sequence += 1;
			return id;
		});
	const enrollmentRequests = createEnrollmentRequestServices(dependencies.courses, dependencies.enrollmentRequests, now, nextEnrollmentId);
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
				search: (query) => searchCourses(dependencies.courses, query),
			},
			enrollmentRequests,
		});

	return { forRequest };
}

export type { AppError, AppResult, FieldError } from './result.ts';
