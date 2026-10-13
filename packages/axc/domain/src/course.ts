export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;

export type CourseModality = (typeof COURSE_MODALITIES)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];

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

/** Read model for the in-memory course catalog. */
export interface CourseCatalog {
	listCourses(): readonly Course[];
}
