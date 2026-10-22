import type { CourseCatalog } from '@axc/persistence';

export type HealthEnvironment = 'local' | 'test' | 'production';
export type Clock = () => Date;

export interface ApiContext {
	environment: HealthEnvironment;
	catalog: CourseCatalog;
	clock: Clock;
}
