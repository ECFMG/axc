import type { Domain } from '@axc/domain';

type Course = Domain.Contexts.Catalog.Course.Course;
type CourseSearchCriteria = Domain.Contexts.Catalog.Course.CourseSearchCriteria;
type CourseSearchResult = Domain.Contexts.Catalog.Course.CourseSearchResult;

export interface CourseReadRepository {
	search(criteria: CourseSearchCriteria): Promise<CourseSearchResult>;
}

function matchesCourse(course: Course, criteria: CourseSearchCriteria): boolean {
	if (criteria.modality !== undefined && course.modality !== criteria.modality) {
		return false;
	}
	if (criteria.status !== undefined && course.status !== criteria.status) {
		return false;
	}
	if (criteria.tag !== undefined) {
		const requestedTag = criteria.tag.toLowerCase();
		if (!course.tags.some((tag) => tag.toLowerCase() === requestedTag)) {
			return false;
		}
	}
	if (criteria.q !== undefined) {
		const keyword = criteria.q.toLowerCase();
		return [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(keyword));
	}
	return true;
}

/** Searches in memory; filtering, sorting and paging stay behind this repository contract. */
export const getCourseReadRepository = (courses: readonly Course[]): CourseReadRepository => ({
	search(criteria) {
		const matches = courses.filter((course) => matchesCourse(course, criteria));
		matches.sort((left, right) => left[criteria.sort].localeCompare(right[criteria.sort]) || left.id.localeCompare(right.id));
		const offset = (criteria.page - 1) * criteria.pageSize;
		return Promise.resolve({ items: matches.slice(offset, offset + criteria.pageSize), totalItems: matches.length });
	},
});
