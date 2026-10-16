import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { expect, vi } from 'vitest';
import * as infrastructure from './index.ts';

const feature = await loadFeature(new URL('./features/service-mongoose.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Local database lifecycle', ({ Then }) => {
		Then('local startup uses MongoDB 7.0.14 and shutdown releases it', async () => {
			expect(infrastructure).toHaveProperty('ServiceMongoose');
			const service = new infrastructure.ServiceMongoose(undefined);
			expect(() => service.service).toThrow();
			try {
				expect(await service.startUp()).toBe(service);
				await expect(service.startUp()).rejects.toThrow('already started');
				const info = await service.service.connection.db?.admin().serverInfo();
				// biome-ignore lint/complexity/useLiteralKeys: MongoDB server info is an index signature
				expect(info?.['version']).toBe('7.0.14');
			} finally {
				await service.shutDown();
			}
			expect(() => service.service).toThrow();
			await expect(service.shutDown()).rejects.toThrow();
		});
	});
	Scenario('Configured database lifecycle', ({ Then }) => {
		Then('configured startup uses the supplied URI', async () => {
			expect(infrastructure).toHaveProperty('ServiceMongoose');
			const memory = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
			const service = new infrastructure.ServiceMongoose(memory.getUri());
			try {
				await service.startUp();
				expect(service.service.connection.port).toBe(Number(new URL(memory.getUri()).port));
				await service.shutDown();
				expect(memory.state).toBe('running');
			} finally {
				await memory.stop();
			}
		});
	});
	Scenario('Connection failure cleanup', ({ Then }) => {
		Then('failed startup closes the local database and can be retried', async () => {
			const service = new infrastructure.ServiceMongoose(undefined);
			const connect = vi.spyOn((await import('mongoose')).Mongoose.prototype, 'connect').mockRejectedValueOnce(new Error('connection failed'));
			const stop = vi.spyOn(MongoMemoryServer.prototype, 'stop');
			try {
				await expect(service.startUp()).rejects.toThrow('connection failed');
				expect(stop).toHaveBeenCalled();
				expect(() => service.service).toThrow();
			} finally {
				connect.mockRestore();
				stop.mockRestore();
			}
			await service.startUp();
			await service.shutDown();
		});
	});
});
