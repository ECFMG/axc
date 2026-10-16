import { type ApiContext, type ApplicationServices, buildApplicationServicesFactory } from '@axc/application-services';
import { createModels, DataSourcesFactoryImpl, seedCourses } from '@axc/persistence';
import { restHandlerCreator } from '@axc/rest';
import { ServiceMongoose } from '@axc/service-mongoose';
import { Cellix } from '@cellix/api-core';
import * as RuntimeConfig from './service-config/runtime/index.ts';

// A configured URI is used as-is; local fixtures are restricted to the in-memory database.
// biome-ignore lint/complexity/useLiteralKeys: ProcessEnv is an index signature
const mongoUri = process.env['MONGODB_URI'];

Cellix.initializeInfrastructureServices<Promise<ApiContext>, ApplicationServices>((serviceRegistry) => {
	serviceRegistry.registerInfrastructureService(new ServiceMongoose(mongoUri));
})
	.setContext(async (registry) => {
		const mongoose = registry.getInfrastructureService(ServiceMongoose);
		const models = createModels(mongoose);
		if (mongoUri === undefined) {
			await seedCourses(models);
		}
		const dataSourcesFactory = DataSourcesFactoryImpl(models);
		return {
			environment: RuntimeConfig.environment,
			dataSourcesFactory,
		};
	})
	.initializeApplicationServices((context) => buildApplicationServicesFactory(context))
	.registerAzureFunctionHttpHandler('courses', { route: 'api/courses', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.startUp();
