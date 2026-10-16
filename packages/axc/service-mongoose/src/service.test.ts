import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { createMemoryMongoServer } from './index.ts';

const feature = await loadFeature(new URL('./features/service.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Pins the local MongoDB version', ({ Given, When, Then }) => {
		let server: ReturnType<typeof createMemoryMongoServer>;
		Given('a local MongoDB server factory', () => {
			/* Dependencies are initialized for this scenario above. */
		});
		When('a server is created', () => {
			server = createMemoryMongoServer();
		});
		Then('it requests MongoDB 7.0.14', () => {
			expect(server.opts.binary?.version).toBe('7.0.14');
		});
	});
});
