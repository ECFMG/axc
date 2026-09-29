import type { CourseReadRepository, CourseSearchResult, RawCourseSearchQuery } from '@axc/domain';
import { parseCourseSearchCriteria } from '@axc/domain';
import { type ApiErrorBody, invalidQueryParameterError } from '../api-error.ts';

/** Either a page of catalog results, or the error envelope describing why the query was rejected. */
export type CourseSearchOutcome = { readonly ok: true; readonly result: CourseSearchResult } | { readonly ok: false; readonly error: ApiErrorBody };

export interface CourseCatalogApplicationService {
	/** Validates an untrusted query, then reads the matching page of the catalog. */
	search(query: RawCourseSearchQuery): Promise<CourseSearchOutcome>;
}

export function buildCourseCatalogApplicationService(repository: CourseReadRepository): CourseCatalogApplicationService {
	return {
		async search(query: RawCourseSearchQuery): Promise<CourseSearchOutcome> {
			const parsed = parseCourseSearchCriteria(query);
			if (!parsed.ok) {
				return { ok: false, error: invalidQueryParameterError(parsed.violations) };
			}
			return { ok: true, result: await repository.search(parsed.criteria) };
		},
	};
}
