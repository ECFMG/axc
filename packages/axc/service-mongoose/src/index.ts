import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import type { Connection } from 'mongoose';

/** Mongoose context factories added in this package use the Cellix mongoose seedwork. */
export type PersistenceContextFactory = MongooseSeedwork.MongooseContextFactory;

/** Active Mongoose connection used by future persistence adapters. */
export type MongoConnection = Connection;

/** Local and test MongoDB process. Uses mongodb-memory-server-core so installs do not run package build scripts. */
export function createMemoryMongoServer(): MongoMemoryServer {
	return new MongoMemoryServer();
}

export { ServiceMongoose } from './service-mongoose.ts';
