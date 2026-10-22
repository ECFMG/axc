import type { ServiceBase } from '@cellix/api-services-spec';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import mongoose from 'mongoose';
import { mongooseContextBuilder } from './models/index.ts';
import { seedCourses } from './seed/course.seed.ts';

export interface ServiceMongooseOptions {
	/** MongoDB connection string. When absent outside production, an in-process replica set is started and seeded. */
	connectionString: string | undefined;
	dbName: string;
	allowInMemory: boolean;
}

/**
 * Cellix infrastructure service owning the Mongoose connection. Units of work run transactions on
 * the default mongoose connection, so this service connects it, and the in-process fallback is a
 * single-node replica set (transactions need one).
 */
export class ServiceMongoose implements ServiceBase<MongooseSeedwork.MongooseContextFactory>, MongooseSeedwork.MongooseContextFactory {
	private readonly options: ServiceMongooseOptions;
	private replicaSet: MongoMemoryReplSet | undefined;

	constructor(options: ServiceMongooseOptions) {
		this.options = options;
	}

	get service(): typeof mongoose {
		return mongoose;
	}

	async startUp(): Promise<MongooseSeedwork.MongooseContextFactory> {
		let uri = this.options.connectionString;
		if (uri === undefined) {
			if (!this.options.allowInMemory) {
				throw new Error('ServiceMongoose: a MongoDB connection string is required outside local and test environments');
			}
			this.replicaSet = await MongoMemoryReplSet.create({ binary: { version: '7.0.14' }, replSet: { count: 1, storageEngine: 'wiredTiger' } });
			uri = this.replicaSet.getUri();
		}
		await mongoose.connect(uri, { dbName: this.options.dbName });
		const models = mongooseContextBuilder(this);
		// init() creates the collections and indexes; they must exist before the first transaction writes (e.g. the unique active-request index).
		await Promise.all([models.Course.init(), models.EnrollmentRequest.init()]);
		if (this.replicaSet) {
			await seedCourses(models);
		}
		return this;
	}

	async shutDown(): Promise<void> {
		await mongoose.disconnect();
		await this.replicaSet?.stop();
	}
}
