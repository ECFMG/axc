import { type ApiContext, type ApplicationServices, buildApplicationServicesFactory } from '@axc/application-services';
import { DataSourcesFactoryImpl } from '@axc/persistence';
import { restHandlerCreator } from '@axc/rest';
import { Cellix } from '@cellix/api-core';
import * as RuntimeConfig from './service-config/runtime/index.ts';
import { TrainingStorage } from './training-storage.ts';

Cellix.initializeInfrastructureServices<ApiContext, ApplicationServices>((serviceRegistry) => {
	const { MONGODB_URI: mongoUri } = process.env;
	serviceRegistry.registerInfrastructureService(new TrainingStorage(mongoUri));
})
	.setContext((serviceRegistry) => {
		const dataSourcesFactory = new DataSourcesFactoryImpl(serviceRegistry.getInfrastructureService(TrainingStorage));
		return {
			environment: RuntimeConfig.environment,
			dataSources: dataSourcesFactory.getDataSources(),
		};
	})
	.initializeApplicationServices((context) => buildApplicationServicesFactory(context))
	.registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('training', { route: 'api/{*path}', methods: ['GET', 'POST', 'PATCH'], authLevel: 'anonymous' }, restHandlerCreator)
	.startUp();
