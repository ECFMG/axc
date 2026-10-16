import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';
import { createMemoryMongoServer, ServiceMongoose } from './index.ts';

const feature = await loadFeature(new URL('./features/lifecycle.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Local startup runs the initializer', ({ Given, When, Then }) => {
		const initialize = vi.fn().mockResolvedValue(undefined);
		const service = new ServiceMongoose(undefined, initialize);
		Given('an unstarted MongoDB service', () => {
			expect(() => service.service).toThrow('not started');
		});
		When('the local service starts', async () => {
			await service.startUp();
		});
		Then('a connected service is initialized and can shut down', async () => {
			try {
				expect(service.service.connection.readyState).toBe(1);
				expect(initialize).toHaveBeenCalledExactlyOnceWith(service);
			} finally {
				await service.shutDown();
			}
			expect(() => service.service).toThrow('not started');
		});
	});
	Scenario('A configured URI does not seed', ({ Given, When, Then }) => {
		const server = createMemoryMongoServer();
		const initialize = vi.fn().mockResolvedValue(undefined);
		let service: ServiceMongoose;
		Given('a configured local test database', async () => {
			await server.start();
			service = new ServiceMongoose(server.getUri(), initialize);
		});
		When('the configured service starts', async () => {
			await service.startUp();
		});
		Then('the local initializer is not called', async () => {
			try {
				expect(initialize).not.toHaveBeenCalled();
				expect(service.service.connection.readyState).toBe(1);
			} finally {
				await service.shutDown();
				await server.stop();
			}
		});
	});
	Scenario('An initializer failure closes local storage', ({ Given, When, Then }) => {
		const failure = new Error('fixture failure');
		const initialize = vi.fn().mockRejectedValue(failure);
		const service = new ServiceMongoose(undefined, initialize);
		let error: unknown;
		Given('an initializer that rejects', () => {
			expect(initialize).not.toHaveBeenCalled();
		});
		When('the local initialization fails', async () => {
			try {
				await service.startUp();
			} catch (caught) {
				error = caught;
			}
		});
		Then('the error propagates and the service is unavailable', () => {
			expect(error).toBe(failure);
			expect(() => service.service).toThrow('not started');
		});
	});
	Scenario('Unstarted service access is explicit', ({ Given, When, Then }) => {
		const service = new ServiceMongoose(undefined, () => Promise.resolve());
		let error: unknown;
		Given('an unstarted MongoDB service', () => {
			/* No startup requested. */
		});
		When('the connection is requested before startup', () => {
			try {
				void service.service;
			} catch (caught) {
				error = caught;
			}
		});
		Then('the service reports that it is not started', () => {
			expect(error).toBeInstanceOf(Error);
			expect(String(error)).toContain('not started');
		});
	});
	Scenario('Duplicate startup is rejected', ({ Given, When, Then }) => {
		const service = new ServiceMongoose(undefined, () => Promise.resolve());
		let error: unknown;
		Given('a started MongoDB service', async () => {
			await service.startUp();
		});
		When('startup is requested again', async () => {
			try {
				await service.startUp();
			} catch (caught) {
				error = caught;
			}
		});
		Then('the original connection remains available', async () => {
			try {
				expect(String(error)).toContain('already started');
				expect(service.service.connection.readyState).toBe(1);
			} finally {
				await service.shutDown();
			}
		});
	});
});
