import type { Course, CourseCatalogReadRepository } from '@axc/domain';
import { type CourseSearchFieldError, type CourseSearchQueryInput, parseCourseSearchQuery } from './course-search-query.ts';

/** A page of catalog search results together with its pagination metadata. */
export interface CourseSearchResultPage {
	readonly items: readonly Course[];
	readonly page: number;
	readonly pageSize: number;
	readonly totalItems: number;
	readonly totalPages: number;
}

export type CourseSearchOutcome = { readonly outcome: 'found'; readonly page: CourseSearchResultPage } | { readonly outcome: 'invalid'; readonly errors: readonly CourseSearchFieldError[] };

/** Course catalog use cases. */
export interface CourseCatalogApplicationService {
	search(query: CourseSearchQueryInput): Promise<CourseSearchOutcome>;
}

/**
 * Builds the course catalog search use case over a read repository.
 *
 * @remarks
 * Invalid query parameters are returned as an outcome rather than thrown, so the delivery
 * layer decides the transport status code.
 */
export function buildCourseCatalogApplicationService(courseCatalog: CourseCatalogReadRepository): CourseCatalogApplicationService {
	const search = async (query: CourseSearchQueryInput): Promise<CourseSearchOutcome> => {
		const validation = parseCourseSearchQuery(query);
		if (validation.outcome === 'invalid') {
			return { outcome: 'invalid', errors: validation.errors };
		}

		const { criteria } = validation;
		const matches = await courseCatalog.search(criteria);

		return {
			outcome: 'found',
			page: {
				items: matches.items,
				page: criteria.page,
				pageSize: criteria.pageSize,
				totalItems: matches.totalItems,
				totalPages: Math.ceil(matches.totalItems / criteria.pageSize),
			},
		};
	};

	return { search };
}
