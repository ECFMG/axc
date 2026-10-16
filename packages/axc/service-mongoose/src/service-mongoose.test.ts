import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { Mongoose } from 'mongoose';
import { expect, vi } from 'vitest';
import { ServiceMongoose } from './service-mongoose.ts';

const feature = await loadFeature(new URL('./features/service-mongoose.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Start and stop local storage', ({ Then }) => {
		Then('an unconfigured service starts MongoDB 7.0.14 and releases it on shutdown', async () => {
			const service = new ServiceMongoose(undefined);
			expect(() => service.service).toThrow();
			try {
				await service.startUp();
				const info = await service.service.connection.db?.admin().serverInfo();
				expect(info?.version).toBe('7.0.14');
				expect(service.service.connection.readyState).toBe(1);
			} finally {
				await service.shutDown();
			}
			expect(() => service.service).toThrow();
			await service.shutDown();
		});
	});
	Scenario('Connect to configured storage', ({ Then }) => {
		Then('a configured service connects without starting another memory server', async () => {
			const local = new ServiceMongoose(undefined);
			await local.startUp();
			const configured = new ServiceMongoose(`mongodb://${local.service.connection.host}:${local.service.connection.port}/${local.service.connection.name}`);
			try {
				await configured.startUp();
				expect(configured.service.connection.readyState).toBe(1);
			} finally {
				await configured.shutDown();
				await local.shutDown();
			}
		});
	});
	Scenario('Failed startup releases local resources', ({ Then }) => {
		Then('a connection failure stops the memory server and leaves the service unavailable', async () => {
			const connect = vi.spyOn(Mongoose.prototype, 'connect').mockRejectedValueOnce(new Error('Connection failed'));
			const stop = vi.spyOn(MongoMemoryServer.prototype, 'stop');
			const service = new ServiceMongoose(undefined);
			try {
				await expect(service.startUp()).rejects.toThrow('Connection failed');
				expect(stop).toHaveBeenCalledOnce();
				expect(() => service.service).toThrow('not started');
			} finally {
				connect.mockRestore();
				stop.mockRestore();
				await service.shutDown();
			}
		});
	});
});
