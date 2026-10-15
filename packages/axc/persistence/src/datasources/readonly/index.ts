import type { Domain } from '@axc/domain';
import { CatalogContext, type CatalogReadonlyDataSource } from './catalog/index.ts';

export interface ReadonlyDataSource {
	Catalog: CatalogReadonlyDataSource;
}

export const ReadonlyDataSourceImplementation = (courses: readonly Domain.Contexts.Catalog.Course.Course[]): ReadonlyDataSource => ({
	Catalog: CatalogContext(courses),
});
