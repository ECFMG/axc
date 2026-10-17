import type { Domain } from '@axc/domain';
import type { CourseModelType } from './models/catalog/course.model.ts';

export type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';

import type { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { DataSourcesFactoryImpl } from './datasources/index.ts';
import { Catalog } from './models/index.ts';

export { seedCourses } from './seed/catalog/course.ts';
export const Persistence = (initializedService: MongooseSeedwork.MongooseContextFactory): { dataSources: Domain.Contexts.Catalog.Course.CatalogDataSources; courseModel: CourseModelType } => {
	const Course = Catalog.CourseModelFactory(initializedService);
	return { dataSources: DataSourcesFactoryImpl({ [Catalog.CourseModelName]: Course }), courseModel: Course };
};
