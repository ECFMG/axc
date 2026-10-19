import { type ApiContext, type ApplicationServices, buildApplicationServicesFactory } from '@axc/application-services';
import { courseSeed, InMemoryCourseRepository, InMemoryEnrollmentRequestRepository } from '@axc/persistence';
import { restHandlerCreator } from '@axc/rest';
import { Cellix } from '@cellix/api-core';
import * as RuntimeConfig from './service-config/runtime/index.ts';

Cellix.initializeInfrastructureServices<ApiContext, ApplicationServices>((serviceRegistry) => {
	void serviceRegistry;
})
	// Cellix calls this once, at app start, so the in-memory repositories keep their state across requests.
	.setContext(() => {
		return {
			environment: RuntimeConfig.environment,
			courseRepository: new InMemoryCourseRepository(courseSeed),
			enrollmentRequestRepository: new InMemoryEnrollmentRequestRepository(),
		};
	})
	.initializeApplicationServices((context) => buildApplicationServicesFactory(context))
	.registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('courses', { route: 'api/courses', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('enrollment-requests', { route: 'api/enrollment-requests', methods: ['GET', 'POST'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('enrollment-request', { route: 'api/enrollment-requests/{id}', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.registerAzureFunctionHttpHandler('enrollment-request-status', { route: 'api/enrollment-requests/{id}/status', methods: ['PATCH'], authLevel: 'anonymous' }, restHandlerCreator)
	.startUp();
