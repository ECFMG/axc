import { type Course, type CourseSearchCriteria, compareCourses, matchesCriteria } from '@axc/domain';
import { courseFixture } from './course-fixture.ts';

export interface CourseSearchPage {
	items: readonly Course[];
	totalItems: number;
}

export interface CourseRepository {
	search(criteria: CourseSearchCriteria): Promise<CourseSearchPage>;
}

/** Catalog repository backed by an in-process array; no external service is required. */
export function createInMemoryCourseRepository(courses: readonly Course[] = courseFixture): CourseRepository {
	return {
		search(criteria: CourseSearchCriteria): Promise<CourseSearchPage> {
			const matched = courses.filter((course) => matchesCriteria(course, criteria)).sort(compareCourses(criteria.sort));
			const offset = (criteria.page - 1) * criteria.pageSize;
			return Promise.resolve({ items: matched.slice(offset, offset + criteria.pageSize), totalItems: matched.length });
		},
	};
}
