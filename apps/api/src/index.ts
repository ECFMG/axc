import { type ApiContext, type ApplicationServices, buildApplicationServicesFactory } from '@axc/application-services';
import { Persistence, seedCourses } from '@axc/persistence';
import { restHandlerCreator } from '@axc/rest';
import { ServiceMongoose } from '@axc/service-mongoose';
import { Cellix } from '@cellix/api-core';
import * as RuntimeConfig from './service-config/runtime/index.ts';

// Local sample catalog is populated before the request services are created.
class CatalogStorage extends ServiceMongoose {
	persistence: ReturnType<typeof Persistence> | undefined;
	override async startUp(): Promise<this> {
		await super.startUp();
		this.persistence = Persistence(this);
		if (RuntimeConfig.mongoUri === undefined) {
			await seedCourses(this.persistence.courseModel);
		}
		return this;
	}
}
Cellix.initializeInfrastructureServices<ApiContext, ApplicationServices>((serviceRegistry) => {
	serviceRegistry.registerInfrastructureService(new CatalogStorage(RuntimeConfig.mongoUri));
})
	.setContext((registry) => {
		const storage = registry.getInfrastructureService(CatalogStorage).persistence;
		if (storage === undefined) {
			throw new Error('Catalog storage has not started');
		}
		return {
			environment: RuntimeConfig.environment,
			dataSources: storage.dataSources,
		};
	})
	.initializeApplicationServices((context) => buildApplicationServicesFactory(context))
	.registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('courses', { route: 'api/courses', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.startUp();
