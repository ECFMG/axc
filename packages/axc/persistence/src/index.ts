import { type DataSources, DataSourcesFactoryImpl } from './datasources/index.ts';
import { seededCourses } from './models/course.seed.ts';

export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';
export type { DataSources } from './datasources/index.ts';

export const Persistence = (): DataSources => {
	return DataSourcesFactoryImpl(seededCourses);
};
