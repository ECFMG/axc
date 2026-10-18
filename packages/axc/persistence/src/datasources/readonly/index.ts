import { Catalog } from './catalog/index.ts';
export const createReadonlyDataSource = () => ({ Catalog: Catalog() });
export type ReadonlyDataSource = ReturnType<typeof createReadonlyDataSource>;
