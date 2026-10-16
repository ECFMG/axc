import { type ApiContext, type ApplicationServices, buildApplicationServicesFactory } from '@axc/application-services';
import { Persistence } from '@axc/persistence';
import { restHandlerCreator } from '@axc/rest';
import { Cellix } from '@cellix/api-core';
import mongoose from 'mongoose';
import { ensureCourseCatalog } from './course-catalog.ts';
import * as RuntimeConfig from './service-config/runtime/index.ts';

Cellix.initializeInfrastructureServices<ApiContext, ApplicationServices>((serviceRegistry) => {
	void serviceRegistry;
})
	.setContext(() => {
		const dataSourcesFactory = Persistence({ service: mongoose });
		return {
			environment: RuntimeConfig.environment,
			dataSourcesFactory,
			ready: ensureCourseCatalog(),
		};
	})
	.initializeApplicationServices((context) => buildApplicationServicesFactory(context))
	.registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)

	.registerAzureFunctionHttpHandler('course-query', { route: 'api/courses', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)

	.registerAzureFunctionHttpHandler('enrollment-requests', { route: 'api/enrollment-requests', methods: ['GET', 'POST'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('enrollment-request-by-id', { route: 'api/enrollment-requests/{id}', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('enrollment-request-status', { route: 'api/enrollment-requests/{id}/status', methods: ['PATCH'], authLevel: 'anonymous' }, restHandlerCreator)
	.startUp();
