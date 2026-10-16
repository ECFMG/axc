import { type ApiContext, buildTrainingApplicationServicesFactory, type TrainingApplicationServices } from '@axc/application-services';
import { type DataSources, Persistence } from '@axc/persistence';
import { restHandlerCreator } from '@axc/rest';
import { ServiceMongoose } from '@axc/service-mongoose';
import { Cellix } from '@cellix/api-core';
import * as RuntimeConfig from './service-config/runtime/index.ts';

type TrainingApiContext = ApiContext & { dataSources: DataSources };
let dataSources: DataSources | undefined;
const mongooseService = new ServiceMongoose(undefined, async (service) => {
	dataSources = await Persistence(service, true);
});
Cellix.initializeInfrastructureServices<TrainingApiContext, TrainingApplicationServices>((serviceRegistry) => {
	serviceRegistry.registerInfrastructureService(mongooseService);
})
	.setContext(() => {
		if (dataSources === undefined) {
			throw new Error('Training persistence must be initialized before creating the API context.');
		}
		return { environment: RuntimeConfig.environment, dataSources };
	})
	.initializeApplicationServices((context) => buildTrainingApplicationServicesFactory(context, context.dataSources))
	.registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('courses', { route: 'api/courses', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('enrollmentRequests', { route: 'api/enrollment-requests/{*path}', methods: ['GET', 'POST', 'PATCH'], authLevel: 'anonymous' }, restHandlerCreator)
	.startUp();
