import type { Repository } from '@cellix/domain-seedwork/repository';

/** Repositories added in this package implement the Cellix repository contract. */
export type DomainRepository<T> = Repository<T>;

export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;

export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: (typeof COURSE_MODALITIES)[number];
	status: (typeof COURSE_STATUSES)[number];
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface CourseRepository extends DomainRepository<Course> {
	list(): Promise<Course[]>;
}

export interface CourseSearch {
	q?: string;
	modality?: Course['modality'];
	status?: Course['status'];
	tag?: string;
	page: number;
	pageSize: number;
	sort: (typeof COURSE_SORT_FIELDS)[number];
}

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}
