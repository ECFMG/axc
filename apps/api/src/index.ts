import { type ApiContext, type ApplicationServices, buildApplicationServicesFactory } from '@axc/application-services';
import { Persistence, seedCourses } from '@axc/persistence';
import { restHandlerCreator } from '@axc/rest';
import { ServiceMongoose } from '@axc/service-mongoose';
import { Cellix } from '@cellix/api-core';
import * as RuntimeConfig from './service-config/runtime/index.ts';

Cellix.initializeInfrastructureServices<ApiContext, ApplicationServices>((serviceRegistry) => {
	serviceRegistry.registerInfrastructureService(new ServiceMongoose(undefined));
})
	.setContext((registry) => {
		const service = registry.getInfrastructureService(ServiceMongoose);
		const dataSources = Persistence(service, { now: () => new Date() });
		const ready = dataSources.initialize().then(async () => {
			if (service.uri === undefined) {
				await seedCourses(dataSources.models);
			}
		});
		return {
			environment: RuntimeConfig.environment,
			dataSources,
			ready,
		};
	})
	.initializeApplicationServices((context) => buildApplicationServicesFactory(context))
	.registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('training', { route: 'api/{*path}', methods: ['GET', 'POST', 'PATCH'], authLevel: 'anonymous' }, restHandlerCreator)
	.startUp();
