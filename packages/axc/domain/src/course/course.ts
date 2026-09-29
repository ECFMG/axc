/** Delivery formats a course can be offered in. */
export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;

/** Lifecycle states a course can be in. */
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;

export type CourseModality = (typeof COURSE_MODALITIES)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];

/** A training course in the agentCourses catalog. */
export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	/** ISO-8601 timestamp. */
	readonly createdAt: string;
	/** ISO-8601 timestamp. */
	readonly updatedAt: string;
}

export function isCourseModality(value: string): value is CourseModality {
	return (COURSE_MODALITIES as readonly string[]).includes(value);
}

export function isCourseStatus(value: string): value is CourseStatus {
	return (COURSE_STATUSES as readonly string[]).includes(value);
}
