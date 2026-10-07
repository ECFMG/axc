export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';

import { DataSourcesFactoryImpl } from './datasources/index.ts';

export type { DataSources, DataSourcesFactory } from './datasources/index.ts';
export type { CoursePage, CourseSearchQuery } from './datasources/readonly/catalog/course/index.ts';
export const createDataSourcesFactory = DataSourcesFactoryImpl;
