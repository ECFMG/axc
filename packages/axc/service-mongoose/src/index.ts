import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { MongoMemoryReplSet } from 'mongodb-memory-server-core';
import type { Connection } from 'mongoose';

/** Mongoose context factories added in this package use the Cellix mongoose seedwork. */
export type PersistenceContextFactory = MongooseSeedwork.MongooseContextFactory;

/** Active Mongoose connection used by future persistence adapters. */
export type MongoConnection = Connection;

/** Local and test MongoDB process. A single-node replica set so unit-of-work transactions can commit. */
export function createMemoryMongoServer(): MongoMemoryReplSet {
	return new MongoMemoryReplSet({
		replSet: { count: 1, name: 'axc' },
	});
}
