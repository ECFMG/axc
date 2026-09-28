export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof COURSE_MODALITIES)[number];

export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const COURSE_SORT_FIELDS = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

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

export function isCourseModality(value: string): value is CourseModality {
	return (COURSE_MODALITIES as readonly string[]).includes(value);
}

export function isCourseStatus(value: string): value is CourseStatus {
	return (COURSE_STATUSES as readonly string[]).includes(value);
}

export function isCourseSortField(value: string): value is CourseSortField {
	return (COURSE_SORT_FIELDS as readonly string[]).includes(value);
}
