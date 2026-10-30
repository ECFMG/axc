import type { Repository } from '@cellix/domain-seedwork/repository';
import type { Contexts } from './domain/index.ts';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export * as Domain from './domain/index.ts';

export interface DomainDataSource {
	Catalog: {
		Course: {
			CourseUnitOfWork: Contexts.Catalog.Course.CourseUnitOfWork;
		};
	};
}
