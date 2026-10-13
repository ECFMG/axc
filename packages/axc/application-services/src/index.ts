import type { CourseRepository } from '@axc/domain';
import { InMemoryCourseCatalog } from '@axc/persistence';
import { type CourseQueryDetail, type CourseQueryErrorBody, type CourseSearchPage, type CourseSearchRequest, type CourseSearchResult, createCourseSearcher } from './courses.ts';

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

export type { CourseQueryDetail, CourseQueryErrorBody, CourseSearchPage, CourseSearchRequest, CourseSearchResult };

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: {
		search(request: CourseSearchRequest): Promise<CourseSearchResult>;
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

export function buildApplicationServicesFactory(context: ApiContext, courses: CourseRepository = new InMemoryCourseCatalog()): ApplicationServicesFactory {
	const courseSearcher = createCourseSearcher(courses);
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
			courses: courseSearcher,
		});

	return { forRequest };
}
