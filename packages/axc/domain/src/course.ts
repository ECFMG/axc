/** Course catalog entity and the pure search rules applied to it. */

export const courseModalities = ['online', 'in-person', 'hybrid'] as const;
export type CourseModality = (typeof courseModalities)[number];

export const courseStatuses = ['draft', 'active', 'retired'] as const;
export type CourseStatus = (typeof courseStatuses)[number];

export const courseSortFields = ['title', 'createdAt', 'updatedAt'] as const;
export type CourseSortField = (typeof courseSortFields)[number];

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

export interface CourseSearchCriteria {
	q?: string;
	modality?: CourseModality;
	status?: CourseStatus;
	tag?: string;
	page: number;
	pageSize: number;
	sort: CourseSortField;
}

/** Keyword match over title, summary and tags; filters are exact except the case-insensitive tag. */
export function matchesCourse(course: Course, criteria: CourseSearchCriteria): boolean {
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
		const needle = criteria.q.toLowerCase();
		const haystack = [course.title, course.summary, ...course.tags].join(' ').toLowerCase();
		if (!haystack.includes(needle)) {
			return false;
		}
	}
	return true;
}

/** Ascending comparator for the supported sort fields. */
export function compareCourses(a: Course, b: Course, sort: CourseSortField): number {
	return a[sort].localeCompare(b[sort]);
}
