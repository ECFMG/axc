import type { DataSourcesFactory } from '@axc/persistence';
import { Catalog, type CatalogContextApplicationService } from './contexts/catalog/index.ts';

export type { CourseSearchQuery, CourseSearchResult } from './contexts/catalog/course/index.ts';
export type { CreateEnrollmentRequestCommand, EnrollmentRequestListQuery, UpdateStatusCommand } from './contexts/catalog/enrollment-request/index.ts';
export { ApplicationError } from './contexts/catalog/errors.ts';
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
	dataSourcesFactory: DataSourcesFactory;
}
export interface ApplicationServices {
	health: { getStatus(): HealthStatus };
	Catalog: CatalogContextApplicationService;
}
export interface ApplicationServicesFactory {
	forRequest(rawAuthHeader?: string): Promise<ApplicationServices>;
}
export function resolveEnvironment(nodeEnv: string | undefined): HealthEnvironment {
	return nodeEnv === 'production' ? 'production' : nodeEnv === 'test' ? 'test' : 'local';
}
export function buildApplicationServicesFactory(context: ApiContext): ApplicationServicesFactory {
	return {
		forRequest: async () => ({
			health: { getStatus: () => ({ status: 'ok', service: HEALTH_SERVICE_NAME, projectCode: HEALTH_PROJECT_CODE, environment: context.environment, timestamp: new Date().toISOString() }) },
			Catalog: Catalog(context.dataSourcesFactory.forRequest()),
		}),
	};
}
