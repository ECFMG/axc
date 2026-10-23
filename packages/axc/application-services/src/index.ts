import type { CatalogStore, EnrollmentRequest } from '@axc/domain';
import { createMemoryCatalog, type MemoryCatalogOptions } from '@axc/persistence';
import { searchCourses } from './course-search.ts';
import { createEnrollmentRequest, getEnrollmentRequest, listEnrollmentRequests, updateEnrollmentRequestStatus } from './enrollment-requests.ts';
import type { CourseSearchResult, EnrollmentRequestList } from './mappers.ts';
import type { RawQuery } from './query.ts';

export const HEALTH_SERVICE_NAME = 'agentCourses-api' as const;
export const HEALTH_PROJECT_CODE = 'axc' as const;

export type { ApiErrorBody, ApiFieldError } from './errors.ts';
export { ApiError, toErrorBody } from './errors.ts';

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
		search(query: RawQuery): CourseSearchResult;
	};
	enrollmentRequests: {
		create(body: unknown): EnrollmentRequest;
		getById(id: string): EnrollmentRequest;
		list(query: RawQuery): EnrollmentRequestList;
		updateStatus(id: string, body: unknown): EnrollmentRequest;
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

export function buildApplicationServicesFactory(context: ApiContext, options?: MemoryCatalogOptions): ApplicationServicesFactory {
	const catalog = createMemoryCatalog(options);
	const forRequest = (): Promise<ApplicationServices> => Promise.resolve(createApplicationServices(context, catalog));
	return { forRequest };
}

function createApplicationServices(context: ApiContext, catalog: CatalogStore): ApplicationServices {
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
		courses: {
			search(query: RawQuery): CourseSearchResult {
				return searchCourses(catalog.listCourses(), query);
			},
		},
		enrollmentRequests: {
			create(body: unknown): EnrollmentRequest {
				return createEnrollmentRequest(catalog, body);
			},
			getById(id: string): EnrollmentRequest {
				return getEnrollmentRequest(catalog, id);
			},
			list(query: RawQuery): EnrollmentRequestList {
				return listEnrollmentRequests(catalog, query);
			},
			updateStatus(id: string, body: unknown): EnrollmentRequest {
				return updateEnrollmentRequestStatus(catalog, id, body);
			},
		},
	};
}
