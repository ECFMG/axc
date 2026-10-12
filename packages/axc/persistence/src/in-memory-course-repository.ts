/** In-memory adapter for the {@link CourseRepository} port. */

import { type Course, type CourseRepository, type CourseSearchCriteria, type CourseSearchResult, searchCourseCollection } from '@axc/domain';
import { SEED_COURSES } from './course-seed.ts';

/**
 * Builds a course repository backed by an immutable in-memory catalog.
 *
 * @param courses - Catalog to serve. Defaults to {@link SEED_COURSES}.
 */
export function createInMemoryCourseRepository(courses: readonly Course[] = SEED_COURSES): CourseRepository {
	const catalog = [...courses];

	return {
		search(criteria: CourseSearchCriteria): Promise<CourseSearchResult> {
			return Promise.resolve(searchCourseCollection(catalog, criteria));
		},
		findById(courseId: string): Promise<Course | undefined> {
			return Promise.resolve(catalog.find((course) => course.id === courseId));
		},
	};
}
