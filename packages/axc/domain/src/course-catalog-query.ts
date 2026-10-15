import type { Course } from './course.ts';
import type { CourseSearchCriteria, CourseSearchResult, CourseSortField } from './course-search.ts';

/**
 * Applies a validated {@link CourseSearchCriteria} to an in-memory course collection.
 *
 * @remarks
 * Filtering, ordering, and pagination semantics live here so every storage adapter
 * answers the same question the same way. Ordering is ascending for all supported
 * sort fields and is made total by tie-breaking on `title` and then `id`, so equal
 * keys never produce an unstable page boundary.
 *
 * @param courses - Every course the adapter can see.
 * @param criteria - Already validated query.
 * @returns The requested page plus pagination metadata. A page beyond the last one
 * yields an empty `items` array rather than an error.
 */
export function queryCourseCatalog(courses: readonly Course[], criteria: CourseSearchCriteria): CourseSearchResult {
	const matched = courses.filter((course) => matchesCriteria(course, criteria));
	const ordered = [...matched].sort((left, right) => compareCourses(left, right, criteria.sort));

	const totalItems = ordered.length;
	const totalPages = Math.ceil(totalItems / criteria.pageSize);
	const offset = (criteria.page - 1) * criteria.pageSize;

	return {
		items: ordered.slice(offset, offset + criteria.pageSize),
		page: criteria.page,
		pageSize: criteria.pageSize,
		totalItems,
		totalPages,
	};
}

function matchesCriteria(course: Course, criteria: CourseSearchCriteria): boolean {
	if (criteria.modality !== undefined && course.modality !== criteria.modality) {
		return false;
	}
	if (criteria.status !== undefined && course.status !== criteria.status) {
		return false;
	}
	if (criteria.tag !== undefined && !hasTag(course, criteria.tag)) {
		return false;
	}
	if (criteria.keyword !== undefined && !matchesKeyword(course, criteria.keyword)) {
		return false;
	}
	return true;
}

function hasTag(course: Course, tag: string): boolean {
	const wanted = tag.toLowerCase();
	return course.tags.some((candidate) => candidate.toLowerCase() === wanted);
}

function matchesKeyword(course: Course, keyword: string): boolean {
	const needle = keyword.toLowerCase();
	return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function compareCourses(left: Course, right: Course, sort: CourseSortField): number {
	const primary = sort === 'title' ? compareTitles(left, right) : compareTimestamps(left[sort], right[sort]);
	if (primary !== 0) {
		return primary;
	}
	const byTitle = compareTitles(left, right);
	return byTitle === 0 ? left.id.localeCompare(right.id) : byTitle;
}

function compareTitles(left: Course, right: Course): number {
	return left.title.localeCompare(right.title, 'en', { sensitivity: 'base' });
}

function compareTimestamps(left: string, right: string): number {
	const leftValue = Date.parse(left);
	const rightValue = Date.parse(right);
	if (Number.isNaN(leftValue) || Number.isNaN(rightValue)) {
		return left.localeCompare(right);
	}
	return leftValue - rightValue;
}
