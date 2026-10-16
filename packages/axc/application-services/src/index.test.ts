import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { DataSources } from '@axc/persistence';
import { expect } from 'vitest';
import { buildApplicationServicesFactory } from './index.ts';

const feature = await loadFeature(new URL('./features/application-services.feature', import.meta.url).pathname);
const dataSources: DataSources = { readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { search: async () => ({ items: [], totalItems: 0 }) } } } } };
describeFeature(feature, ({ Scenario }) => {
	Scenario('Pending infrastructure context', ({ Then }) => {
		Then('requests await a successfully initialized context', async () => {
			const factory = buildApplicationServicesFactory(Promise.resolve({ environment: 'test', dataSourcesFactory: { getDataSources: () => dataSources } }));
			expect((await factory.forRequest()).health.getStatus().environment).toBe('test');
		});
	});
	Scenario('Failed infrastructure context', ({ Then }) => {
		Then('initialization rejection is handled before requests and propagated to requests', async () => {
			const error = new Error('seed failed');
			const factory = buildApplicationServicesFactory(Promise.reject(error));
			await new Promise<void>((resolve) => setImmediate(resolve));
			await expect(factory.forRequest()).rejects.toBe(error);
		});
	});
});
