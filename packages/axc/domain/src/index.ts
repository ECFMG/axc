import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;

export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: (typeof COURSE_MODALITIES)[number];
	readonly status: (typeof COURSE_STATUSES)[number];
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

/** Read-only catalog port; Cellix's get/save repository is for mutable aggregates. */
export interface CourseCatalogRepository {
	list(): Promise<readonly Course[]>;
}
