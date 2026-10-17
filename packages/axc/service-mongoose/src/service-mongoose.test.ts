import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { createMemoryMongoServer, ServiceMongoose } from './index.ts';

const feature = await loadFeature('./src/features/service-mongoose.feature');
describeFeature(feature, ({ Scenario }) => {
	Scenario('Configured MongoDB connection', ({ When, Then }) => {
		const server = createMemoryMongoServer();
		let service: ServiceMongoose;
		When('storage starts with a configured MongoDB URI', async () => {
			await server.start();
			service = new ServiceMongoose(server.getUri('configured'));
			await service.startUp();
		});
		Then('the configured database is connected without starting another memory server', async () => {
			try {
				expect(service.service.connection.name).toBe('configured');
			} finally {
				await service.shutDown();
				await server.stop();
			}
		});
	});
	Scenario('Failed connection is explicit', ({ When, Then }) => {
		const service = new ServiceMongoose('invalid-uri');
		let failure: unknown;
		When('storage starts with an invalid MongoDB URI', async () => {
			failure = await service.startUp().catch((error: unknown) => error);
		});
		Then('startup rejects and no service is exposed', async () => {
			expect(failure).toBeInstanceOf(Error);
			expect(() => service.service).toThrow('not started');
			await service.shutDown();
		});
	});
	Scenario('Local MongoDB starts and stops', ({ When, Then }) => {
		const service = new ServiceMongoose(undefined);
		When('local storage is started without a configured URI', async () => {
			await service.startUp();
		});
		Then('a connected MongoDB service is available and can shut down', async () => {
			try {
				expect(service.service.connection.readyState).toBe(1);
			} finally {
				await service.shutDown();
			}
			expect(() => service.service).toThrow('not started');
		});
	});
	Scenario('Unstarted service has no connection', ({ When, Then }) => {
		let failure: unknown;
		When('the connection is accessed before startup', () => {
			try {
				void new ServiceMongoose(undefined).service;
			} catch (error) {
				failure = error;
			}
		});
		Then('access fails explicitly', () => {
			expect(failure).toBeInstanceOf(Error);
		});
	});
});
