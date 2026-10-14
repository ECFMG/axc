import type { DataSources } from '@axc/persistence';
import { Catalog, type CatalogApplicationService } from './contexts/catalog/index.ts';

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
	Catalog: CatalogApplicationService;
}

export interface ApplicationServicesFactory {
	forRequest(rawAuthHeader?: string): Promise<ApplicationServices>;
}

export { type CourseSearchQuery, type CourseSearchResult, InvalidQueryParameterError } from './contexts/catalog/index.ts';

export function resolveEnvironment(nodeEnv: string | undefined): HealthEnvironment {
	if (nodeEnv === 'production') {
		return 'production';
	}
	if (nodeEnv === 'test') {
		return 'test';
	}
	return 'local';
}

export function buildApplicationServicesFactory({ environment, dataSources }: ApiContext): ApplicationServicesFactory {
	const forRequest = (): Promise<ApplicationServices> =>
		Promise.resolve({
			health: {
				getStatus(): HealthStatus {
					return {
						status: 'ok',
						service: HEALTH_SERVICE_NAME,
						projectCode: HEALTH_PROJECT_CODE,
						environment,
						timestamp: new Date().toISOString(),
					};
				},
			},
			Catalog: Catalog(dataSources),
		});

	return { forRequest };
}
