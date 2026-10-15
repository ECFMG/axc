import type { Domain } from '@axc/domain';
import { CatalogReadRepositories } from './catalog/index.ts';

export * as Catalog from './catalog/index.ts';
export const ReadonlyDataSourceImplementation = (courses: readonly Domain.Contexts.Catalog.Course.Course[]) => ({ Catalog: CatalogReadRepositories(courses) });
export type ReadonlyDataSource = ReturnType<typeof ReadonlyDataSourceImplementation>;
