import type { CourseReadRepository } from '@axc/domain';
import { buildCourseSearchApplicationService, type CourseSearchApplicationService } from './courses/course-search-service.ts';

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
	/** Course catalog read model supplied by the composition root. */
	courses: CourseReadRepository;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: CourseSearchApplicationService;
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
	const courses = buildCourseSearchApplicationService(context.courses);

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
		});

	return { forRequest };
}

export type { CourseSearchFieldError, CourseSearchQueryInput } from './courses/course-search-query.ts';
export type { CourseSearchApplicationService, CourseSearchOutcome } from './courses/course-search-service.ts';
