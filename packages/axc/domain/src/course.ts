export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export const COURSE_SORTS = ['title', 'createdAt', 'updatedAt'] as const;

export type CourseModality = (typeof COURSE_MODALITIES)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];
export type CourseSort = (typeof COURSE_SORTS)[number];

export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	readonly createdAt: string;
	readonly updatedAt: string;
}

/** Courses are read-only reference data in this bounded context. */
export interface CourseRepository {
	list(): Promise<readonly Course[]>;
	getById(id: string): Promise<Course | undefined>;
}
