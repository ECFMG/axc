/** Delivery formats a course can be offered in. */
export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;

/** Delivery format of a course. */
export type CourseModality = (typeof COURSE_MODALITIES)[number];

/** Lifecycle states a course can be in. */
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;

/** Lifecycle state of a course. */
export type CourseStatus = (typeof COURSE_STATUSES)[number];

/** A catalog entry describing a single training course. */
export interface Course {
	/** Stable, unique identifier. */
	readonly id: string;
	/** Human-readable course title. */
	readonly title: string;
	/** Short description of the course. */
	readonly summary: string;
	/** Delivery format. */
	readonly modality: CourseModality;
	/** Lifecycle state. */
	readonly status: CourseStatus;
	/** Free-form searchable tags. */
	readonly tags: readonly string[];
	/** ISO-8601 timestamp of when the course was created. */
	readonly createdAt: string;
	/** ISO-8601 timestamp of when the course was last updated. */
	readonly updatedAt: string;
}

/** Narrows an arbitrary string to a {@link CourseModality}. */
export function isCourseModality(value: string): value is CourseModality {
	return (COURSE_MODALITIES as readonly string[]).includes(value);
}

/** Narrows an arbitrary string to a {@link CourseStatus}. */
export function isCourseStatus(value: string): value is CourseStatus {
	return (COURSE_STATUSES as readonly string[]).includes(value);
}
