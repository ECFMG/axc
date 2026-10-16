import { type ApiContext, type ApplicationServices, buildApplicationServicesFactory } from '@axc/application-services';
import { Persistence, seedCourses } from '@axc/persistence';
import { restHandlerCreator } from '@axc/rest';
import { ServiceMongoose } from '@axc/service-mongoose';
import { Cellix } from '@cellix/api-core';
import * as RuntimeConfig from './service-config/runtime/index.ts';

Cellix.initializeInfrastructureServices<ApiContext, ApplicationServices>((serviceRegistry) => {
	// biome-ignore lint/complexity/useLiteralKeys: ProcessEnv requires bracket access
	serviceRegistry.registerInfrastructureService(new ServiceMongoose(process.env['MONGODB_URI'], seedCourses));
})
	.setContext((serviceRegistry) => {
		return {
			environment: RuntimeConfig.environment,
			dataSources: Persistence(serviceRegistry.getInfrastructureService(ServiceMongoose)),
		};
	})
	.initializeApplicationServices((context) => buildApplicationServicesFactory(context))
	.registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('courses', { route: 'api/courses', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.startUp();
