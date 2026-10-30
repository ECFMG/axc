import type { Domain, DomainDataSource } from '@axc/domain';
import type { ModelsContext } from '../../models-context.ts';
import { CatalogContextPersistence } from './catalog/index.ts';

export const DomainDataSourceImplementation = (models: ModelsContext, passport: Domain.Passport): DomainDataSource => ({
	Catalog: CatalogContextPersistence(models, passport),
});
