import type { ServiceBase } from '@cellix/api-services-spec';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import { Mongoose } from 'mongoose';

export class ServiceMongoose implements ServiceBase<MongooseSeedwork.MongooseContextFactory>, MongooseSeedwork.MongooseContextFactory {
	private readonly uri: string | undefined;
	private memoryServer: MongoMemoryServer | undefined;
	private instance: Mongoose | undefined;
	constructor(uri: string | undefined) {
		this.uri = uri;
	}
	get service(): Mongoose {
		if (this.instance === undefined) {
			throw new Error('ServiceMongoose is not started');
		}
		return this.instance;
	}
	async startUp(): Promise<this> {
		let uri = this.uri;
		if (uri === undefined || uri.trim().length === 0) {
			this.memoryServer = await MongoMemoryServer.create({ binary: { version: '7.0.14' } });
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
		await this.instance?.disconnect();
		this.instance = undefined;
		await this.memoryServer?.stop();
		this.memoryServer = undefined;
	}
}
