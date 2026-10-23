import { type CourseReadRepository, createInMemoryCourseReadRepository } from '@axc/persistence';
import { type CourseSearchInput, type CourseSearchOutcome, searchCourses } from './courses.ts';

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

export function buildApplicationServicesFactory(context: ApiContext, catalog: CourseReadRepository = createInMemoryCourseReadRepository()): ApplicationServicesFactory {
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
