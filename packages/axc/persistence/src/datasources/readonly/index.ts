import { Catalog } from './catalog/index.ts';
export const ReadonlyDataSource = () => ({ Catalog: Catalog() });
