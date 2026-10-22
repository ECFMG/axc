import type { ServiceMongooseOptions } from '@axc/service-mongoose';
import { environment } from '../runtime/index.ts';

const { MONGODB_CONNECTION_STRING: connectionString, MONGODB_DB_NAME: dbName } = process.env;

/** Without a connection string, local and test runs use an in-process seeded replica set; production must configure one. */
export const mongooseOptions: ServiceMongooseOptions = {
	connectionString,
	dbName: dbName ?? 'agentcourses',
	allowInMemory: environment !== 'production',
};
