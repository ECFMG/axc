import type { DataSourcesFactory } from '@axc/persistence';
import { Catalog } from './contexts/index.ts';

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
	dataSourcesFactory: DataSourcesFactory;
	environment: HealthEnvironment;
}

export interface ApplicationServices {
	Catalog: ReturnType<typeof Catalog>;
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

export function buildApplicationServicesFactory(context: ApiContext | Promise<ApiContext>): ApplicationServicesFactory {
	// Record startup failure immediately, even before the first HTTP request arrives.
	const initializedContext = Promise.resolve(context).then(
		(value) => ({ ready: true as const, value }),
		(error: unknown) => ({ ready: false as const, error }),
	);
	const forRequest = async (): Promise<ApplicationServices> => {
		const initialized = await initializedContext;
		if (!initialized.ready) {
			throw initialized.error;
		}
		const resolvedContext = initialized.value;
		return {
			Catalog: Catalog(resolvedContext.dataSourcesFactory.getDataSources()),
			health: {
				getStatus(): HealthStatus {
					return {
						status: 'ok',
						service: HEALTH_SERVICE_NAME,
						projectCode: HEALTH_PROJECT_CODE,
						environment: resolvedContext.environment,
						timestamp: new Date().toISOString(),
					};
				},
			},
		};
	};

	return { forRequest };
}
