import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: 'online' | 'in-person' | 'hybrid';
	readonly status: 'draft' | 'active' | 'retired';
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}
