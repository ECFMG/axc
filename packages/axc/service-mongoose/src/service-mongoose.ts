import type { ServiceBase } from '@cellix/api-services-spec';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { MongoMemoryServer } from 'mongodb-memory-server-core';
import { Mongoose } from 'mongoose';
import { createMemoryMongoServer } from './index.ts';

export class ServiceMongoose implements ServiceBase<MongooseSeedwork.MongooseContextFactory>, MongooseSeedwork.MongooseContextFactory {
	private readonly uri: string | undefined;
	private instance: Mongoose | undefined;
	private memoryServer: MongoMemoryServer | undefined;
	constructor(uri: string | undefined) {
		this.uri = uri;
	}
	get service(): Mongoose {
		if (this.instance === undefined) {
			throw new Error('ServiceMongoose has not started');
		}
		return this.instance;
	}
	async startUp(): Promise<this> {
		if (this.instance !== undefined) {
			throw new Error('ServiceMongoose has already started');
		}
		let uri = this.uri;
		if (uri === undefined) {
			this.memoryServer = createMemoryMongoServer();
			await this.memoryServer.start();
			uri = this.memoryServer.getUri();
		}
		const instance = new Mongoose();
		try {
			await instance.connect(uri);
			this.instance = instance;
			return this;
		} catch (error) {
			await instance.disconnect();
			await this.memoryServer?.stop();
			this.memoryServer = undefined;
			throw error;
		}
	}
	async shutDown(): Promise<void> {
		if (this.instance === undefined) {
			throw new Error('ServiceMongoose has not started');
		}
		try {
			await this.instance.disconnect();
		} finally {
			this.instance = undefined;
			await this.memoryServer?.stop();
			this.memoryServer = undefined;
		}
	}
}
