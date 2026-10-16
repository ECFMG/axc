import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export { EnrollmentWorkflowError } from './domain/contexts/catalog/enrollment-request/index.ts';
export * as Domain from './domain/index.ts';
