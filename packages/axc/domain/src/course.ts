export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof COURSE_MODALITIES)[number];

export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export const DEFAULT_COURSE_PAGE = 1;
export const DEFAULT_COURSE_PAGE_SIZE = 10;
export const MAX_COURSE_PAGE_SIZE = 50;
export const DEFAULT_COURSE_SORT: CourseSortField = 'title';

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

/** Read port for the training course catalog. */
export interface CourseCatalog {
	listAll(): Promise<readonly Course[]>;
}

export function isCourseModality(value: string): value is CourseModality {
	return includesValue(COURSE_MODALITIES, value);
}

export function isCourseStatus(value: string): value is CourseStatus {
	return includesValue(COURSE_STATUSES, value);
}

export function isCourseSortField(value: string): value is CourseSortField {
	return includesValue(COURSE_SORT_FIELDS, value);
}

function includesValue<T extends string>(values: readonly T[], value: string): value is T {
	return (values as readonly string[]).includes(value);
}
