import type { CourseReadRepository, CourseSearchPage } from '@axc/domain';
import { type CourseSearchFieldError, type CourseSearchQueryInput, validateCourseSearchQuery } from './course-search-query.ts';

/** Result of a catalog search: either a page of courses or the parameters that were rejected. */
export type CourseSearchOutcome = { readonly outcome: 'found'; readonly page: CourseSearchPage } | { readonly outcome: 'invalid-query'; readonly errors: readonly CourseSearchFieldError[] };

export interface CourseSearchApplicationService {
	search(input: CourseSearchQueryInput): Promise<CourseSearchOutcome>;
}

/**
 * Course catalog search use case.
 *
 * @remarks
 * Validates the incoming query, then delegates the match itself to the injected
 * read model. Transport concerns such as status codes stay in `@axc/rest`.
 */
export function buildCourseSearchApplicationService(courses: CourseReadRepository): CourseSearchApplicationService {
	return {
		async search(input: CourseSearchQueryInput): Promise<CourseSearchOutcome> {
			const validation = validateCourseSearchQuery(input);
			if (!validation.valid) {
				return { outcome: 'invalid-query', errors: validation.errors };
			}
			return { outcome: 'found', page: await courses.search(validation.criteria) };
		},
	};
}
