import type { Domain } from '@axc/domain';
import type { CourseModelType } from '../models/catalog/course.model.ts';
import { getCourseReadRepository } from './readonly/index.ts';
export const DataSourcesFactoryImpl = (models: { Course: CourseModelType }): Domain.Contexts.Catalog.Course.CatalogDataSources => ({ readonlyDataSource: { Catalog: { Course: getCourseReadRepository(models) } } });
