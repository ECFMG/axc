/** Allowed delivery modalities for a catalog course. */
export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;

/** Delivery modality of a catalog course. */
export type CourseModality = (typeof COURSE_MODALITIES)[number];

/** Allowed lifecycle states for a catalog course. */
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;

/** Lifecycle state of a catalog course. */
export type CourseStatus = (typeof COURSE_STATUSES)[number];

/** A training course as published by the catalog read model. */
export interface Course {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly modality: CourseModality;
	readonly status: CourseStatus;
	readonly tags: readonly string[];
	/** ISO-8601 instant the course was created. */
	readonly createdAt: string;
	/** ISO-8601 instant the course was last updated. */
	readonly updatedAt: string;
}
