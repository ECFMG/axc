import type { DataSources } from '@axc/persistence';
import { openCourseDataSources } from '@axc/persistence';
import { Course, type CourseApplicationService } from './contexts/course/course/index.ts';

export const HEALTH_SERVICE_NAME = 'agentCourses-api' as const;
export const HEALTH_PROJECT_CODE = 'axc' as const;

export type { CourseQueryCommand } from './contexts/course/course/index.ts';

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
	dataSources?: DataSources;
}

export interface ApplicationServices {
	health: {
		getStatus(): HealthStatus;
	};
	Course: {
		Course: CourseApplicationService;
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
	const dataSourcesPromise = context.dataSources !== undefined ? Promise.resolve(context.dataSources) : openCourseDataSources();
	const forRequest = (): Promise<ApplicationServices> =>
		dataSourcesPromise.then((dataSources) => ({
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
			Course: {
				Course: Course(dataSources),
			},
		}));

	return { forRequest };
}
