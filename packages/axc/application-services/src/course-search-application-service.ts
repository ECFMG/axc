import type { CourseReadRepository, CourseSearchResult } from '@axc/domain';
import { type ParsedCourseQuery, parseCourseSearchQuery, type QueryParameterError, type RawCourseQuery } from './course-query.ts';

/** Outcome of a course catalog search request. */
export type CourseSearchOutcome = { readonly ok: true; readonly result: CourseSearchResult } | { readonly ok: false; readonly errors: readonly QueryParameterError[] };

/** Use case behind `GET /api/courses`. */
export interface CourseSearchApplicationService {
	/** Validates `rawQuery` and, when it is valid, returns the matching page of courses. */
	search(rawQuery: RawCourseQuery): Promise<CourseSearchOutcome>;
}

/**
 * Builds the course catalog search use case over a read repository.
 *
 * @remarks
 * Validation failures are returned as data rather than thrown, so the transport layer
 * decides the status code and wire format and this layer stays free of HTTP concepts.
 *
 * @param repository - Read side of the course catalog.
 * @returns The course search application service.
 */
export function buildCourseSearchApplicationService(repository: CourseReadRepository): CourseSearchApplicationService {
	return {
		search: async (rawQuery) => {
			const parsed: ParsedCourseQuery = parseCourseSearchQuery(rawQuery);
			if (!parsed.ok) {
				return { ok: false, errors: parsed.errors };
			}
			return { ok: true, result: await repository.search(parsed.criteria) };
		},
	};
}
