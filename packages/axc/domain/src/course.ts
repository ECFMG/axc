/** Course catalog entity and the pure search rules applied to it. */

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
	tags: readonly string[];
	/** ISO-8601 date string. */
	createdAt: string;
	/** ISO-8601 date string. */
	updatedAt: string;
}

export interface CourseSearchCriteria {
	/** Case-insensitive keyword matched against title, summary and tags. */
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	/** Case-insensitive exact tag match. */
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

/** True when the course satisfies every supplied filter. */
export function matchesCriteria(course: Course, criteria: CourseSearchCriteria): boolean {
	if (criteria.modality !== undefined && course.modality !== criteria.modality) {
		return false;
	}
	if (criteria.status !== undefined && course.status !== criteria.status) {
		return false;
	}
	if (criteria.tag !== undefined && !course.tags.some((tag) => tag.toLowerCase() === criteria.tag?.toLowerCase())) {
		return false;
	}
	if (criteria.q !== undefined) {
		const keyword = criteria.q.toLowerCase();
		const haystack = [course.title, course.summary, ...course.tags].join('\n').toLowerCase();
		if (!haystack.includes(keyword)) {
			return false;
		}
	}
	return true;
}

/** Ascending comparator for the requested sort field; `id` breaks ties so ordering is stable. */
export function compareCourses(sort: CourseSortField): (left: Course, right: Course) => number {
	return (left, right) => {
		const compared = left[sort].localeCompare(right[sort]);
		return compared === 0 ? left.id.localeCompare(right.id) : compared;
	};
}
