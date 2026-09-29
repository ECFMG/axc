/** Delivery modes a catalog course can be offered in. */
export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;

/** Delivery mode of a single course. */
export type CourseModality = (typeof COURSE_MODALITIES)[number];

/** Lifecycle states a catalog course moves through. */
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;

/** Lifecycle state of a single course. */
export type CourseStatus = (typeof COURSE_STATUSES)[number];

/** A training course as published in the catalog. */
export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	/** Free-form labels. Stored as authored; all matching is case-insensitive. */
	readonly tags: readonly string[];
	/** ISO-8601 instant the course was created. */
	readonly createdAt: string;
	/** ISO-8601 instant the course was last changed. */
	readonly updatedAt: string;
}

export function isCourseModality(value: string): value is CourseModality {
	return (COURSE_MODALITIES as readonly string[]).includes(value);
}

export function isCourseStatus(value: string): value is CourseStatus {
	return (COURSE_STATUSES as readonly string[]).includes(value);
}
