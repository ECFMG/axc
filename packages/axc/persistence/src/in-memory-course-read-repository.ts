import { type Course, type CourseReadRepository, queryCourseCatalog } from '@axc/domain';
import { COURSE_CATALOG_SEED } from './course-seed.ts';

/**
 * Builds a {@link CourseReadRepository} backed by an in-memory collection.
 *
 * @remarks
 * Filtering, ordering, and pagination are delegated to `queryCourseCatalog` so the
 * in-memory adapter and any future Mongoose adapter answer identically. The supplied
 * collection is copied, so later mutation of the caller's array cannot change results.
 *
 * @param courses - Catalog to serve. Defaults to {@link COURSE_CATALOG_SEED}.
 * @returns A read repository over `courses`.
 */
export function createInMemoryCourseReadRepository(courses: readonly Course[] = COURSE_CATALOG_SEED): CourseReadRepository {
	const catalog: readonly Course[] = [...courses];
	return {
		search: (criteria) => Promise.resolve(queryCourseCatalog(catalog, criteria)),
	};
}
