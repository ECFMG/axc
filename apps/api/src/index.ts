import { type ApiContext, type ApplicationServices, buildApplicationServicesFactory } from '@axc/application-services';
import { Persistence } from '@axc/persistence';
import { restHandlerCreator } from '@axc/rest';
import { courseSeed } from '@axc/service-mongoose';
import { Cellix } from '@cellix/api-core';
import mongoose from 'mongoose';
import * as RuntimeConfig from './service-config/runtime/index.ts';

// biome-ignore lint/complexity/useLiteralKeys: ProcessEnv.MONGODB_URI is an index signature under noPropertyAccessFromIndexSignature
const mongoUri = process.env['MONGODB_URI'];
if (typeof mongoUri === 'string' && mongoUri.length > 0) {
	await mongoose.connect(mongoUri);
}

const dataSourcesFactory = Persistence({ service: mongoose });

if (mongoose.connection.readyState === 1) {
	const courses = mongoose.connection.collection('courses');
	if ((await courses.countDocuments()) === 0) {
		await courses.insertMany(courseSeed as unknown as Parameters<typeof courses.insertMany>[0]);
	}
}

Cellix.initializeInfrastructureServices<ApiContext, ApplicationServices>((serviceRegistry) => {
	void serviceRegistry;
})
	.setContext(() => {
		return {
			environment: RuntimeConfig.environment,
			dataSourcesFactory,
		};
	})
	.initializeApplicationServices((context) => buildApplicationServicesFactory(context))
	.registerAzureFunctionHttpHandler('health', { route: 'health', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)

	.registerAzureFunctionHttpHandler('course-search', { route: 'api/courses', methods: ['GET'], authLevel: 'anonymous' }, restHandlerCreator)
	.startUp();
