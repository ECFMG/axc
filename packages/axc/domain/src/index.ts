import type { Repository } from '@cellix/domain-seedwork/repository';

export type { Catalog } from './domain/contexts/index.ts';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;
