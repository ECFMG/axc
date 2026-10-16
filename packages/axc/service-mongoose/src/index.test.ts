import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';
import { ServiceMongoose } from './index.ts';

const feature = await loadFeature('src/features/lifecycle.feature');
describeFeature(feature, ({ Scenario, AfterEachScenario }) => {
	AfterEachScenario(() => {
		vi.restoreAllMocks();
	});
	Scenario('Configured storage starts before initialization', ({ Given, When, Then }) => {
		let service: ServiceMongoose;
		const initialize = vi.fn(() => Promise.resolve());
		Given('a configured mongoose service', () => {
			service = new ServiceMongoose('mongodb://configured-test-host/training', initialize);
			vi.spyOn(service.service, 'connect').mockImplementation(() => {
				expect(initialize).not.toHaveBeenCalled();
				return Promise.resolve(service.service);
			});
			vi.spyOn(service.service, 'disconnect').mockResolvedValue();
		});
		When('storage startup succeeds', async () => {
			await service.startUp();
		});
		Then('initialization runs after connection', async () => {
			expect(service.service.connect).toHaveBeenCalledWith('mongodb://configured-test-host/training');
			expect(initialize).toHaveBeenCalledWith(service);
			await service.shutDown();
			expect(service.service.disconnect).toHaveBeenCalledOnce();
		});
	});
	Scenario('Failed initialization cleans up the connection', ({ Given, When, Then }) => {
		let service: ServiceMongoose;
		let error: unknown;
		const failure = new Error('fixture initialization failure');
		Given('a configured mongoose service', () => {
			service = new ServiceMongoose('mongodb://configured-test-host/training', () => Promise.reject(failure));
			vi.spyOn(service.service, 'connect').mockResolvedValue(service.service);
			vi.spyOn(service.service, 'disconnect').mockResolvedValue();
		});
		When('storage initialization fails', async () => {
			try {
				await service.startUp();
			} catch (caught) {
				error = caught;
			}
		});
		Then('startup reports failure and disconnects', () => {
			expect(error).toBe(failure);
			expect(service.service.disconnect).toHaveBeenCalledOnce();
		});
	});
});
