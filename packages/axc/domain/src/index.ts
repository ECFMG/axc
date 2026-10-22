import type { Repository } from '@cellix/domain-seedwork/repository';

export * as Training from './domain/contexts/training/index.ts';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;
