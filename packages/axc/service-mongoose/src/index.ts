import type { ServiceBase } from '@cellix/api-services-spec';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server-core';
import mongoose, { type Connection } from 'mongoose';

export type PersistenceContextFactory = MongooseSeedwork.MongooseContextFactory;
export type MongoConnection = Connection;
export function createMemoryMongoServer(): MongoMemoryServer {
	return new MongoMemoryServer({ binary: { version: '7.0.14' } });
}

/** Uses the default connection required by the vendored MongoUnitOfWork. */
export class ServiceMongoose implements ServiceBase, MongooseSeedwork.MongooseContextFactory {
	readonly service = mongoose;
	readonly uri: string | undefined;
	private server: MongoMemoryReplSet | undefined;
	constructor(uri: string | undefined) {
		this.uri = uri;
	}
	async startUp(): Promise<void> {
		let uri = this.uri;
		if (uri === undefined) {
			this.server = await MongoMemoryReplSet.create({ binary: { version: '7.0.14' }, replSet: { count: 1 } });
			uri = this.server.getUri();
		}
		await this.service.connect(uri);
	}
	async shutDown(): Promise<void> {
		await this.service.disconnect();
		if (this.server !== undefined) {
			await this.server.stop();
		}
	}
}
