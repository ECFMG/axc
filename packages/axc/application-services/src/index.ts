import type { CourseReadRepository } from '@axc/domain';
import { InMemoryCourseReadRepository } from '@axc/persistence';
import { buildCourseCatalogApplicationService, type CourseCatalogApplicationService } from './courses/course-catalog.ts';

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
	/** Overrides the fixture-backed catalog. Left unset by the API host; supplied by tests. */
	courseRepository?: CourseReadRepository | undefined;
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
	const courses = buildCourseCatalogApplicationService(context.courseRepository ?? new InMemoryCourseReadRepository());

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

// The catalog contract is owned by the domain; re-exported here so delivery layers
// depend on the application services surface alone.
export type { Course, CourseModality, CourseReadRepository, CourseSearchCriteria, CourseSearchResult, CourseSortField, CourseStatus, RawCourseSearchQuery } from '@axc/domain';
export { COURSE_MODALITIES, COURSE_SORT_FIELDS, COURSE_STATUSES, DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT_FIELD, MAX_COURSE_PAGE_SIZE } from '@axc/domain';
export type { ApiErrorBody, ApiErrorDetail } from './api-error.ts';
export { INVALID_QUERY_PARAMETER_CODE, INVALID_QUERY_PARAMETER_MESSAGE, invalidQueryParameterError } from './api-error.ts';
export type { CourseCatalogApplicationService, CourseSearchOutcome } from './courses/course-catalog.ts';
export { buildCourseCatalogApplicationService } from './courses/course-catalog.ts';
