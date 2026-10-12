/** Course catalog model shared by the catalog search and enrollment request workflows. */

/** Delivery formats a course can be offered in. */
export const COURSE_MODALITIES = ['online', 'in-person', 'hybrid'] as const;

/** Delivery format of a course. */
export type CourseModality = (typeof COURSE_MODALITIES)[number];

/** Lifecycle states a course can be in. Only `active` courses accept enrollment requests. */
export const COURSE_STATUSES = ['draft', 'active', 'retired'] as const;

/** Lifecycle state of a course. */
export type CourseStatus = (typeof COURSE_STATUSES)[number];

/** A training course in the agentCourses catalog. */
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

/** Whether the course is open for enrollment requests. */
export function isEnrollableCourse(course: Course): boolean {
	return course.status === 'active';
}
