import { type ApiErrorResponse, invalidQueryParameterResponse } from './api-error.ts';
import type { CourseCatalogRepository } from './course-catalog-repository.ts';
import type { CourseSearchResult } from './course-search-criteria.ts';
import { type CourseSearchQueryParameters, parseCourseSearchCriteria } from './course-search-criteria-parser.ts';

/** Result of a catalog search request: either a page of courses or the reason the request was rejected. */
export type CourseSearchOutcome = { readonly status: 'ok'; readonly result: CourseSearchResult } | { readonly status: 'invalid'; readonly error: ApiErrorResponse };

/** Catalog search use case. Validation lives here so every delivery mechanism rejects the same inputs. */
export interface CourseCatalogApplicationService {
	search(query: CourseSearchQueryParameters): Promise<CourseSearchOutcome>;
}

export function createCourseCatalogApplicationService(repository: CourseCatalogRepository): CourseCatalogApplicationService {
	return {
		search: async (query) => {
			const parsed = parseCourseSearchCriteria(query);
			if (!parsed.ok) {
				return { status: 'invalid', error: invalidQueryParameterResponse(parsed.violations) };
			}
			return { status: 'ok', result: await repository.search(parsed.criteria) };
		},
	};
}
