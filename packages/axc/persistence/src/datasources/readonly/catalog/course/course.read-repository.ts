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
	if (criteria.tag !== undefined && !course.tags.some((tag) => tag.toLowerCase() === criteria.tag?.toLowerCase())) {
		return false;
	}
	if (criteria.q !== undefined) {
		const keyword = criteria.q.toLowerCase();
		return [course.title, course.summary, ...course.tags].some((text) => text.toLowerCase().includes(keyword));
	}
	return true;
}

function compareText(left: string, right: string): number {
	if (left < right) {
		return -1;
	}
	if (left > right) {
		return 1;
	}
	return 0;
}

/** All catalog filtering, ordering and pagination stay behind the read repository. */
export function getCourseReadRepository(courses: readonly Course[]): CourseReadRepository {
	return {
		search(criteria): Promise<CourseSearchResult> {
			const matches = courses.filter((course) => matchesCourse(course, criteria));
			matches.sort((left, right) => compareText(left[criteria.sort], right[criteria.sort]) || compareText(left.id, right.id));
			const offset = (criteria.page - 1) * criteria.pageSize;
			return Promise.resolve({
				items: matches.slice(offset, offset + criteria.pageSize),
				page: criteria.page,
				pageSize: criteria.pageSize,
				totalItems: matches.length,
				totalPages: Math.ceil(matches.length / criteria.pageSize),
			});
		},
	};
}
