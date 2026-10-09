import type { DataSources } from '@axc/persistence';
import { Catalog, type CatalogContextApplicationService } from './contexts/catalog/index.ts';

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
	dataSources: DataSources;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	Catalog: CatalogContextApplicationService;
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
			Catalog: Catalog(context.dataSources),
		});

	return { forRequest };
}

export type { CatalogContextApplicationService, CourseApplicationService, CourseSearchQuery, CourseSearchResult, QueryParameterErrorDetail } from './contexts/catalog/index.ts';
export { InvalidQueryParameterError } from './contexts/catalog/index.ts';
