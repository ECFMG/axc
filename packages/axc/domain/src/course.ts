export const courseModalities = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof courseModalities)[number];

export const courseStatuses = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof courseStatuses)[number];

export interface Course {
	id: string;
	title: string;
	summary: string;
	modality: CourseModality;
	status: CourseStatus;
	tags: readonly string[];
	createdAt: string;
	updatedAt: string;
}

export function isCourseModality(value: string): value is CourseModality {
	return courseModalities.some((item) => item === value);
}

export function isCourseStatus(value: string): value is CourseStatus {
	return courseStatuses.some((item) => item === value);
}
