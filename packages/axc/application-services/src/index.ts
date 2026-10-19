import type { CourseRepository, EnrollmentRequestRepository } from '@axc/domain';
import { type CourseSearchResult, parseCourseQuery, type RawCourseQuery, searchCourses } from './course-catalog.ts';
import { createEnrollmentRequestService, type EnrollmentRequestService } from './enrollment-requests.ts';

export type { Course, CourseModality, CourseRepository, CourseStatus, EnrollmentRequest, EnrollmentRequestRepository, EnrollmentRequestStatus, StatusHistoryEntry } from '@axc/domain';
export * from './course-catalog.ts';
export * from './enrollment-requests.ts';

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
	courseRepository: CourseRepository;
	enrollmentRequestRepository: EnrollmentRequestRepository;
	/** Clock used for enrollment timestamps. Defaults to `() => new Date()`. */
	now?: () => Date;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	courses: {
		search(raw: RawCourseQuery): Promise<CourseSearchResult>;
	};
	enrollmentRequests: EnrollmentRequestService;
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
	const enrollmentRequests = createEnrollmentRequestService({
		courseRepository: context.courseRepository,
		enrollmentRequestRepository: context.enrollmentRequestRepository,
		now: context.now ?? (() => new Date()),
	});

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
				async search(raw: RawCourseQuery): Promise<CourseSearchResult> {
					const parsed = parseCourseQuery(raw);
					if (!parsed.ok) {
						return { ok: false, errors: parsed.errors };
					}
					const courses = await context.courseRepository.getAll();
					return { ok: true, result: searchCourses(courses, parsed.criteria) };
				},
			},
			enrollmentRequests,
		});

	return { forRequest };
}
