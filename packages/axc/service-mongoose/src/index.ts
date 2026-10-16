import type { ServiceBase } from '@cellix/api-services-spec';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server-core';
import mongoose, { type Connection } from 'mongoose';

export type PersistenceContextFactory = MongooseSeedwork.MongooseContextFactory;
export type MongoConnection = Connection;
export function createMemoryMongoServer(): MongoMemoryServer {
	return new MongoMemoryServer();
}

export class ServiceMongoose implements ServiceBase, PersistenceContextFactory {
	readonly service = mongoose;
	private memoryServer: MongoMemoryReplSet | undefined;
	private readonly uri: string | undefined;
	private readonly initialize: (service: PersistenceContextFactory) => Promise<void>;
	constructor(uri: string | undefined, initialize: (service: PersistenceContextFactory) => Promise<void>) {
		this.uri = uri;
		this.initialize = initialize;
	}

	async startUp(): Promise<void> {
		try {
			let uri = this.uri;
			if (uri === undefined) {
				this.memoryServer = await MongoMemoryReplSet.create({ binary: { version: '7.0.14' }, replSet: { count: 1, storageEngine: 'wiredTiger' } });
				uri = this.memoryServer.getUri();
			}
			await this.service.connect(uri);
			await this.initialize(this);
		} catch (error) {
			await this.shutDown();
			throw error;
		}
	}
	async shutDown(): Promise<void> {
		await this.service.disconnect();
		if (this.memoryServer !== undefined) {
			await this.memoryServer.stop();
			this.memoryServer = undefined;
		}
	}
}
