import type { Store } from '../store.ts';
import { CatalogContext } from './catalog/index.ts';

export const ReadonlyDataSourceImplementation = (store: Store) => ({ Catalog: CatalogContext(store) });
export type ReadonlyDataSource = ReturnType<typeof ReadonlyDataSourceImplementation>;
