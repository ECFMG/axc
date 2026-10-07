import type { DataSources } from '@axc/persistence';
import { Course as CourseApi, type CourseApplicationService } from './course/index.ts';

export interface CatalogContextApplicationService {
	Course: CourseApplicationService;
}

export const Catalog = (dataSources: DataSources): CatalogContextApplicationService => ({ Course: CourseApi(dataSources) });
