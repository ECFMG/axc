import type { Domain } from '@axc/domain';
import { Course, type CourseApplicationService } from './course/index.ts';
export interface CatalogApplicationService {
	Course: CourseApplicationService;
}
export const Catalog = (dataSources: Domain.Contexts.Catalog.Course.CatalogDataSources): CatalogApplicationService => ({ Course: Course(dataSources) });
