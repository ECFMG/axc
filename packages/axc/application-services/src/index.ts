import type { DataSourcesFactory } from '@axc/persistence';
import { Training, type TrainingContextApplicationService } from './contexts/training/index.ts';

export type { CourseSearchInput } from './contexts/training/course/search.ts';
export type { EnrollmentRequestStatusCommand } from './contexts/training/enrollment-request/change-status.ts';
export type { EnrollmentRequestCreateCommand } from './contexts/training/enrollment-request/create.ts';
export { ApplicationError } from './contexts/training/errors.ts';

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
	Training: TrainingContextApplicationService;
}
export interface ApplicationServicesFactory {
	forRequest(rawAuthHeader?: string): Promise<ApplicationServices>;
}
export function resolveEnvironment(nodeEnv: string | undefined): HealthEnvironment {
	if (nodeEnv === 'production') return 'production';
	if (nodeEnv === 'test') return 'test';
	return 'local';
}
export function buildApplicationServicesFactory(context: ApiContext): ApplicationServicesFactory {
	const forRequest = (): Promise<ApplicationServices> =>
		Promise.resolve({
			health: { getStatus: (): HealthStatus => ({ status: 'ok', service: HEALTH_SERVICE_NAME, projectCode: HEALTH_PROJECT_CODE, environment: context.environment, timestamp: new Date().toISOString() }) },
			Training: Training(context.dataSourcesFactory.forRequest()),
		});
	return { forRequest };
}
