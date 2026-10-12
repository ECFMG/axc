/** Healthcheck contract served by `GET /health`. */

/** Service name reported by the healthcheck. */
export const HEALTH_SERVICE_NAME = 'agentCourses-api' as const;

/** Project code reported by the healthcheck. */
export const HEALTH_PROJECT_CODE = 'axc' as const;

/** Runtime environment reported by the healthcheck. */
export type HealthEnvironment = 'local' | 'test' | 'production';

/** Body returned by `GET /health`. */
export interface HealthStatus {
	status: 'ok';
	service: typeof HEALTH_SERVICE_NAME;
	projectCode: typeof HEALTH_PROJECT_CODE;
	environment: HealthEnvironment;
	timestamp: string;
}

/** Maps `NODE_ENV` onto the healthcheck environment vocabulary. */
export function resolveEnvironment(nodeEnv: string | undefined): HealthEnvironment {
	if (nodeEnv === 'production') {
		return 'production';
	}
	if (nodeEnv === 'test') {
		return 'test';
	}
	return 'local';
}

/** Builds the healthcheck service for a request. */
export function createHealthService(environment: HealthEnvironment): { getStatus(): HealthStatus } {
	return {
		getStatus(): HealthStatus {
			return {
				status: 'ok',
				service: HEALTH_SERVICE_NAME,
				projectCode: HEALTH_PROJECT_CODE,
				environment,
				timestamp: new Date().toISOString(),
			};
		},
	};
}
