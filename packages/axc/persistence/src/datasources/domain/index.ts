import type { Store } from '../store.ts';
import { CatalogContextPersistence } from './catalog/index.ts';
export const DomainDataSourceImplementation = (store: Store) => ({ Catalog: CatalogContextPersistence(store) });
export type DomainDataSource = ReturnType<typeof DomainDataSourceImplementation>;
