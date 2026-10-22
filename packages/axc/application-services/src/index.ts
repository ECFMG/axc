import type { CoursePage, EnrollmentRequest } from '@axc/domain';
import { createCatalogStores } from '@axc/persistence';
import { createCourseSearch } from './course-search.ts';
import { createEnrollmentRequests, type EnrollmentList } from './enrollment-requests.ts';
import type { RawQuery } from './query.ts';

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
		search(query: RawQuery): Promise<CoursePage>;
	};
	enrollmentRequests: {
		create(body: unknown): Promise<EnrollmentRequest>;
		getById(id: string): Promise<EnrollmentRequest>;
		list(query: RawQuery): Promise<EnrollmentList>;
		updateStatus(id: string, body: unknown): Promise<EnrollmentRequest>;
	};
}

export interface ApplicationServicesFactory {
	forRequest(rawAuthHeader?: string): Promise<ApplicationServices>;
}

export type { FieldError } from './errors.ts';
export { ApplicationError } from './errors.ts';
export type { RawQuery } from './query.ts';

const systemClock = {
	now(): string {
		return new Date().toISOString();
	},
};

export function resolveEnvironment(nodeEnv: string | undefined): HealthEnvironment {
	if (nodeEnv === 'production') {
		return 'production';
	}
	if (nodeEnv === 'test') {
		return 'test';
	}
	return 'local';
}

export function buildApplicationServicesFactory(context: ApiContext, clock: { now(): string } = systemClock): ApplicationServicesFactory {
	const services = createApplicationServices(context, clock);
	const forRequest = (): Promise<ApplicationServices> => Promise.resolve(services);
	return { forRequest };
}

function createApplicationServices(context: ApiContext, clock: { now(): string }): ApplicationServices {
	const stores = createCatalogStores();
	return {
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
		courses: createCourseSearch(stores.courses),
		enrollmentRequests: createEnrollmentRequests(stores.courses, stores.enrollmentRequests, clock),
	};
}
