import type { DataSources } from '@axc/persistence';
import { Training } from './contexts/index.ts';
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
		});

	return { forRequest };
}

export interface TrainingApplicationServices extends ApplicationServices, Training.TrainingApplicationService {}
export interface TrainingApplicationServicesFactory {
	forRequest(rawAuthHeader?: string): Promise<TrainingApplicationServices>;
}
export function buildTrainingApplicationServicesFactory(context: ApiContext, dataSources: DataSources): TrainingApplicationServicesFactory {
	const healthFactory = buildApplicationServicesFactory(context);
	return {
		async forRequest(rawAuthHeader) {
			const healthServices = await healthFactory.forRequest(rawAuthHeader);
			return {
				...healthServices,
				courses: { search: Training.Course.search(dataSources) },
				enrollmentRequests: {
					create: Training.EnrollmentRequest.create(dataSources),
					queryById: Training.EnrollmentRequest.queryById(dataSources),
					list: Training.EnrollmentRequest.list(dataSources),
					changeStatus: Training.EnrollmentRequest.changeStatus(dataSources),
				},
			};
		},
	};
}
