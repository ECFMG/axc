import { type CourseSearchCriteria, type CourseSearchResult, searchCourses } from './courses.ts';

export type { Course, CourseModality, CourseQueryErrorBody, CourseQueryErrorDetail, CourseQueryParseResult, CourseSearchCriteria, CourseSearchResult, CourseSortField, CourseStatus } from './courses.ts';
export {
	COURSE_CATALOG,
	COURSE_MODALITIES,
	COURSE_SORT_FIELDS,
	COURSE_STATUSES,
	DEFAULT_COURSE_PAGE_SIZE,
	MAX_COURSE_PAGE_SIZE,
	parseCourseQuery,
	searchCourses,
} from './courses.ts';

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
		search(criteria: CourseSearchCriteria): CourseSearchResult;
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
				search: searchCourses,
			},
		});

	return { forRequest };
}
