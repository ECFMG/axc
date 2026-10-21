import { type CoursePage, type CourseQuery, searchCourses } from './courses.ts';
import { createEnrollmentService } from './enrollments.ts';

export type { Course, CoursePage, CourseQuery } from './courses.ts';
export type { EnrollmentRequest, EnrollmentStatus } from './enrollment-request.ts';
export { EnrollmentError } from './enrollment-request.ts';

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
	courses: { search(query: CourseQuery): CoursePage };
	enrollments: ReturnType<typeof createEnrollmentService>;
	health: {
		getStatus(): HealthStatus;
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
	const enrollments = createEnrollmentService();
	const forRequest = (): Promise<ApplicationServices> =>
		Promise.resolve({
			courses: { search: searchCourses },
			enrollments,
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
		});

	return { forRequest };
}
