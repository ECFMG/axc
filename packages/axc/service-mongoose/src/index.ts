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
	private serviceInternal: Mongoose | undefined;
	private memoryServer: MongoMemoryServer | undefined;

	private readonly uri: string | undefined;
	private readonly initializeLocal: (context: MongooseSeedwork.MongooseContextFactory) => Promise<void>;

	constructor(uri: string | undefined, initializeLocal: (context: MongooseSeedwork.MongooseContextFactory) => Promise<void>) {
		this.uri = uri;
		this.initializeLocal = initializeLocal;
	}

	get service(): Mongoose {
		if (this.serviceInternal === undefined) {
			throw new Error('ServiceMongoose is not started');
		}
		return this.serviceInternal;
	}

	async startUp(): Promise<this> {
		if (this.serviceInternal !== undefined) {
			throw new Error('ServiceMongoose is already started');
		}
		const connection = new Mongoose();
		const configuredUri = this.uri?.trim();
		try {
			let uri: string;
			if (configuredUri === undefined || configuredUri === '') {
				this.memoryServer = createMemoryMongoServer();
				await this.memoryServer.start();
				uri = this.memoryServer.getUri();
			} else {
				uri = configuredUri;
			}
			await connection.connect(uri);
			this.serviceInternal = connection;
			if (this.memoryServer !== undefined) {
				await this.initializeLocal(this);
			}
			return this;
		} catch (error) {
			await connection.disconnect();
			await this.memoryServer?.stop();
			this.serviceInternal = undefined;
			this.memoryServer = undefined;
			throw error;
		}
	}

	async shutDown(): Promise<void> {
		const connection = this.service;
		try {
			await connection.disconnect();
		} finally {
			await this.memoryServer?.stop();
			this.serviceInternal = undefined;
			this.memoryServer = undefined;
		}
	}
}
