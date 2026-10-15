import type { Domain } from '@axc/domain';

type Course = Domain.Contexts.Catalog.Course.Course;
type Criteria = Domain.Contexts.Catalog.Course.CourseSearchCriteria;

function matchesCourse(course: Course, criteria: Criteria): boolean {
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
		return [course.title, course.summary, ...course.tags].some((value) => value.toLowerCase().includes(keyword));
	}
	return true;
}

export function getCourseReadRepository(courses: readonly Course[]): Domain.Contexts.Catalog.Course.CourseReadRepository {
	return {
		search(criteria) {
			const matches = courses.filter((course) => matchesCourse(course, criteria));
			matches.sort((a, b) => a[criteria.sort].localeCompare(b[criteria.sort]) || a.id.localeCompare(b.id));
			const totalItems = matches.length;
			const totalPages = Math.ceil(totalItems / criteria.pageSize);
			// Check page bounds before multiplication to avoid unsafe offsets for large valid pages.
			const offset = criteria.page > totalPages ? totalItems : (criteria.page - 1) * criteria.pageSize;
			const items = matches.slice(offset, offset + criteria.pageSize);
			return Promise.resolve({ items, page: criteria.page, pageSize: criteria.pageSize, totalItems, totalPages });
		},
	};
}
