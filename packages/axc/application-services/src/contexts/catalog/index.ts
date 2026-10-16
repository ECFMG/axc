import type { DataSources } from '@axc/persistence';
import { Course, type CourseApplicationService } from './course/index.ts';

interface CatalogApplicationService {
	Course: CourseApplicationService;
}
export const Catalog = (dataSources: DataSources): CatalogApplicationService => ({ Course: Course(dataSources) });
