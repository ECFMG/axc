import type { Domain } from '@axc/domain';
import { DataSourcesFactoryImpl } from './datasources/index.ts';
import { seededCourses } from './models/course.seed.ts';

export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';
export type { DataSources } from './datasources/index.ts';

export function createCatalogDataSources(courses: readonly Domain.Contexts.Catalog.Course.Course[] = seededCourses) {
	return DataSourcesFactoryImpl(courses);
}
