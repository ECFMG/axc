import type { Repository } from '@cellix/domain-seedwork/repository';

export type DomainRepository<T> = Repository<T>;
export * as Catalog from './domain/contexts/catalog/index.ts';
