import type { Domain } from '@axc/domain';

type Course = Domain.Contexts.Catalog.Course.Course;
type Criteria = Domain.Contexts.Catalog.Course.CourseSearchCriteria;
type Result = Domain.Contexts.Catalog.Course.CourseSearchResult;
export interface CourseReadRepository {
	search(criteria: Criteria): Promise<Result>;
}
function matches(course: Course, criteria: Criteria): boolean {
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
		return [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(keyword));
	}
	return true;
}
export function getCourseReadRepository(courses: readonly Course[]): CourseReadRepository {
	return {
		search: (criteria) => {
			const matching = courses.filter((course) => matches(course, criteria));
			matching.sort((left, right) => left[criteria.sort].localeCompare(right[criteria.sort]) || left.id.localeCompare(right.id));
			const offset = (criteria.page - 1) * criteria.pageSize;
			return Promise.resolve({
				items: matching.slice(offset, offset + criteria.pageSize),
				page: criteria.page,
				pageSize: criteria.pageSize,
				totalItems: matching.length,
				totalPages: Math.ceil(matching.length / criteria.pageSize),
			});
		},
	};
}
