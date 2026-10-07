import type { Course } from './course.ts';
import type { CourseSearchCriteria, CourseSortField } from './course-search.ts';

/**
 * Whether a course satisfies every filter in the criteria.
 *
 * @remarks
 * Keyword search is a case-insensitive substring match against the title, the summary, or
 * any tag. The tag filter is a case-insensitive whole-tag match.
 */
export function courseMatchesCriteria(course: Course, criteria: CourseSearchCriteria): boolean {
	return matchesKeyword(course, criteria.keyword) && matchesModality(course, criteria) && matchesStatus(course, criteria) && matchesTag(course, criteria.tag);
}

/** Ascending comparator for the requested sort field, with a stable tie-break on id. */
export function compareCoursesBy(sort: CourseSortField): (left: Course, right: Course) => number {
	return (left, right) => {
		const comparison = sort === 'title' ? compareText(left.title, right.title) : compareText(left[sort], right[sort]);
		return comparison === 0 ? compareText(left.id, right.id) : comparison;
	};
}

function matchesKeyword(course: Course, keyword: string | undefined): boolean {
	if (keyword === undefined) {
		return true;
	}
	const needle = keyword.toLowerCase();
	return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
}

function matchesModality(course: Course, criteria: CourseSearchCriteria): boolean {
	return criteria.modality === undefined || course.modality === criteria.modality;
}

function matchesStatus(course: Course, criteria: CourseSearchCriteria): boolean {
	return criteria.status === undefined || course.status === criteria.status;
}

function matchesTag(course: Course, tag: string | undefined): boolean {
	if (tag === undefined) {
		return true;
	}
	const wanted = tag.toLowerCase();
	return course.tags.some((candidate) => candidate.toLowerCase() === wanted);
}

/** Deterministic, locale-independent case-insensitive ordering. */
function compareText(left: string, right: string): number {
	const normalizedLeft = left.toLowerCase();
	const normalizedRight = right.toLowerCase();
	if (normalizedLeft < normalizedRight) {
		return -1;
	}
	return normalizedLeft > normalizedRight ? 1 : 0;
}
