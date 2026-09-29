import type { Course } from './course.ts';
import type { CourseSearchCriteria, CourseSortField } from './course-search-criteria.ts';

/** A page of catalog results together with the metadata needed to page through the rest. */
export interface CourseSearchResult {
	readonly items: readonly Course[];
	readonly page: number;
	readonly pageSize: number;
	readonly totalItems: number;
	readonly totalPages: number;
}

/** True when a course satisfies every supplied filter. Keyword and tag comparisons are case-insensitive. */
export function matchesCourseSearchCriteria(course: Course, criteria: CourseSearchCriteria): boolean {
	if (criteria.modality !== undefined && course.modality !== criteria.modality) {
		return false;
	}
	if (criteria.status !== undefined && course.status !== criteria.status) {
		return false;
	}
	const tag = criteria.tag;
	if (tag !== undefined && !course.tags.some((candidate) => candidate.toLowerCase() === tag)) {
		return false;
	}
	const keyword = criteria.keyword;
	if (keyword !== undefined) {
		const haystack = [course.title, course.summary, ...course.tags];
		if (!haystack.some((candidate) => candidate.toLowerCase().includes(keyword))) {
			return false;
		}
	}
	return true;
}

/**
 * Orders two courses by the requested field, ascending, falling back to `id` so that the
 * order is total and paging is stable across requests.
 */
export function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const primary = sort === 'title' ? left.title.localeCompare(right.title, 'en', { sensitivity: 'base' }) : left[sort].localeCompare(right[sort]);
	return primary === 0 ? left.id.localeCompare(right.id) : primary;
}

/** Applies filtering, sorting and pagination to an in-memory set of courses. */
export function searchCourses(courses: readonly Course[], criteria: CourseSearchCriteria): CourseSearchResult {
	const matched = courses.filter((course) => matchesCourseSearchCriteria(course, criteria)).sort((left, right) => compareCourses(left, right, criteria.sort));
	const offset = (criteria.page - 1) * criteria.pageSize;

	return {
		items: matched.slice(offset, offset + criteria.pageSize),
		page: criteria.page,
		pageSize: criteria.pageSize,
		totalItems: matched.length,
		totalPages: Math.ceil(matched.length / criteria.pageSize),
	};
}
