export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export const COURSE_SORTS = ['title', 'createdAt', 'updatedAt'] as const;

export const DEFAULT_COURSE_PAGE = 1;
export const DEFAULT_COURSE_PAGE_SIZE = 10;
export const MAX_COURSE_PAGE_SIZE = 50;

export type CourseModality = (typeof COURSE_MODALITIES)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];
export type CourseSort = (typeof COURSE_SORTS)[number];

export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

export interface CourseRepository {
	list(): Promise<Course[]>;
	getById(id: string): Promise<Course | undefined>;
}

export function isCourseModality(value: string): value is CourseModality {
	return COURSE_MODALITIES.some((candidate) => candidate === value);
}

export function isCourseStatus(value: string): value is CourseStatus {
	return COURSE_STATUSES.some((candidate) => candidate === value);
}

export function isCourseSort(value: string): value is CourseSort {
	return COURSE_SORTS.some((candidate) => candidate === value);
}
