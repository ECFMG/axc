import type { CourseCatalogReadRepository } from '@axc/domain';
import { buildCourseCatalogApplicationService, type CourseCatalogApplicationService } from './course/course-catalog.ts';

export type { CourseCatalogApplicationService, CourseSearchOutcome, CourseSearchResultPage } from './course/course-catalog.ts';
export type { CourseSearchFieldError, CourseSearchQueryInput, CourseSearchQueryValidation } from './course/course-search-query.ts';
export { parseCourseSearchQuery } from './course/course-search-query.ts';

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
	courseCatalog: CourseCatalogReadRepository;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: CourseCatalogApplicationService;
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
	const courses = buildCourseCatalogApplicationService(context.courseCatalog);

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
