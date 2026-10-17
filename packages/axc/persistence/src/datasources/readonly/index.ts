import type { Store } from '../store.ts';
import { CatalogReadonly } from './catalog/index.ts';
export const ReadonlyDataSourceImplementation = (store: Store) => ({ Catalog: CatalogReadonly(store) });
