import { type Course, type CourseReadRepository, type CourseSearchCriteria, type CourseSearchPage, searchCourses } from '@axc/domain';
import { courseSeedData } from './course-seed-data.ts';

/**
 * Builds a course read model backed by an immutable in-memory collection.
 *
 * @remarks
 * The catalog is reference data for this scaffold, so it needs no database. The
 * repository keeps the same contract a Mongo-backed implementation would satisfy,
 * which is why all search semantics stay in `@axc/domain`.
 *
 * @param courses - Catalog to serve. Defaults to {@link courseSeedData}.
 */
export function createInMemoryCourseReadRepository(courses: readonly Course[] = courseSeedData): CourseReadRepository {
	const catalog = [...courses];
	return {
		search(criteria: CourseSearchCriteria): Promise<CourseSearchPage> {
			return Promise.resolve(searchCourses(catalog, criteria));
		},
	};
}
