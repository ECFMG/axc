import type { ServiceBase } from '@cellix/api-services-spec';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { type Connection, Mongoose } from 'mongoose';

/** Mongoose context factories added in this package use the Cellix mongoose seedwork. */
export type PersistenceContextFactory = MongooseSeedwork.MongooseContextFactory;

/** Active Mongoose connection used by future persistence adapters. */
export type MongoConnection = Connection;

/** Local and test MongoDB process. Uses mongodb-memory-server-core so installs do not run package build scripts. */
export function createMemoryMongoServer(): MongoMemoryServer {
	return new MongoMemoryServer({ binary: { version: '7.0.14' } });
}

export class ServiceMongoose implements ServiceBase<MongooseSeedwork.MongooseContextFactory>, MongooseSeedwork.MongooseContextFactory {
	private connection: Mongoose | undefined;
	private memoryServer: MongoMemoryServer | undefined;
	private readonly uri: string | undefined;
	constructor(uri: string | undefined) {
		this.uri = uri;
	}
	get service(): Mongoose {
		if (this.connection === undefined) {
			throw new Error('ServiceMongoose is not started');
		}
		return this.connection;
	}
	async startUp(): Promise<this> {
		let uri = this.uri?.trim();
		if (uri === undefined || uri === '') {
			this.memoryServer = createMemoryMongoServer();
			await this.memoryServer.start();
			uri = this.memoryServer.getUri();
		}
		const connection = new Mongoose();
		try {
			await connection.connect(uri);
			this.connection = connection;
		} catch (error) {
			await connection.disconnect();
			await this.memoryServer?.stop();
			this.memoryServer = undefined;
			throw error;
		}
		return this;
	}
	async shutDown(): Promise<void> {
		try {
			await this.connection?.disconnect();
		} finally {
			this.connection = undefined;
			await this.memoryServer?.stop();
			this.memoryServer = undefined;
		}
	}
}
