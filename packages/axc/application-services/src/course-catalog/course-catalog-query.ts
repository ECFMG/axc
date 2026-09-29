import type { Course } from './course.ts';
import type { CourseSearchCriteria, CourseSearchResult, CourseSortField } from './course-search-criteria.ts';

/**
 * Applies filtering, ordering, and pagination to an in-memory catalog.
 *
 * Kept pure so the same rules can be exercised by unit tests and reused by any
 * repository that is able to materialise its courses.
 */
export function searchCourseCatalog(courses: readonly Course[], criteria: CourseSearchCriteria): CourseSearchResult {
	const matched = courses.filter((course) => matchesCriteria(course, criteria));
	const ordered = [...matched].sort((left, right) => compareCourses(left, right, criteria.sort));
	const totalItems = ordered.length;
	const firstIndex = (criteria.page - 1) * criteria.pageSize;

	return {
		items: ordered.slice(firstIndex, firstIndex + criteria.pageSize),
		page: criteria.page,
		pageSize: criteria.pageSize,
		totalItems,
		totalPages: Math.ceil(totalItems / criteria.pageSize),
	};
}

/** True when a course satisfies every supplied filter. */
export function matchesCriteria(course: Course, criteria: CourseSearchCriteria): boolean {
	if (criteria.modality !== undefined && course.modality !== criteria.modality) {
		return false;
	}
	if (criteria.status !== undefined && course.status !== criteria.status) {
		return false;
	}
	if (criteria.tag !== undefined && !hasTag(course, criteria.tag)) {
		return false;
	}
	return criteria.q === undefined || matchesKeyword(course, criteria.q);
}

/** Case-insensitive substring match across title, summary, and tags. */
function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

/** Case-insensitive whole-tag match. */
function hasTag(course: Course, tag: string): boolean {
	const needle = tag.toLowerCase();
	return course.tags.some((candidate) => candidate.toLowerCase() === needle);
}

/** Ascending order on the requested field, with `id` as a stable tie-breaker. */
function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const primary = sort === 'title' ? left.title.toLowerCase().localeCompare(right.title.toLowerCase()) : left[sort].localeCompare(right[sort]);
	return primary === 0 ? left.id.localeCompare(right.id) : primary;
}
