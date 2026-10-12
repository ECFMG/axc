/** Application service behind `GET /api/courses`. */

import type { CourseRepository, CourseSearchResult, RawQuery } from '@axc/domain';
import { validateCourseSearchQuery } from '@axc/domain';

/** Course catalog search use cases. */
export interface CourseSearchService {
	/**
	 * Validates a raw query string bag and returns the matching page of courses.
	 *
	 * @throws AxcDomainError `INVALID_QUERY_PARAMETER` when a parameter is outside its domain.
	 */
	search(query: RawQuery): Promise<CourseSearchResult>;
}

/** Builds the course search service over a course repository. */
export function createCourseSearchService(courses: CourseRepository): CourseSearchService {
	return {
		async search(query: RawQuery): Promise<CourseSearchResult> {
			return await courses.search(validateCourseSearchQuery(query));
		},
	};
}
