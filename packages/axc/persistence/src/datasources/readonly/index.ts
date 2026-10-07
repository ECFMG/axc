import type { CourseReadRepository } from './catalog/course/index.ts';
import { CatalogContext } from './catalog/index.ts';

export interface ReadonlyDataSource {
	Catalog: { Course: { CourseReadRepo: CourseReadRepository } };
}

export const ReadonlyDataSourceImplementation = (): ReadonlyDataSource => ({
	Catalog: CatalogContext(),
});
