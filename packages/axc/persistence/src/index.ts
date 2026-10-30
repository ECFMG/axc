import { mongooseContextBuilder } from '@axc/data-sources-mongoose-models';
import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { DataSourcesFactoryImpl } from './datasources/index.ts';
import type { ModelsContext } from './models-context.ts';

export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';
export type { DataSources, DataSourcesFactory } from './datasources/index.ts';
export type { ModelsContext } from './models-context.ts';

export const Persistence = (initializedService: MongooseSeedwork.MongooseContextFactory) => {
	if (!initializedService?.service) {
		throw new Error('MongooseSeedwork.MongooseContextFactory is required');
	}
	const models: ModelsContext = {
		...mongooseContextBuilder(initializedService),
	};
	return DataSourcesFactoryImpl(models);
};
