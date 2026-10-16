import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { createMemoryMongoServer } from './index.ts';

const feature = await loadFeature(new URL('./features/service-mongoose.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('MongoDB binary is reproducible', ({ Given, When, Then }) => {
		let version: string | undefined;
		Given('a local MongoDB factory', () => expect(createMemoryMongoServer).toBeTypeOf('function'));
		When('a local server is configured', () => {
			version = createMemoryMongoServer().opts.binary?.version;
		});
		Then('MongoDB version "7.0.14" is selected', () => expect(version).toBe('7.0.14'));
	});
});
