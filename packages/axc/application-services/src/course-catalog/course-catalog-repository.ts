import type { Course } from './course.ts';
import { searchCourseCatalog } from './course-catalog-query.ts';
import type { CourseSearchCriteria, CourseSearchResult } from './course-search-criteria.ts';

/** Read port the catalog use case depends on. Implementations may be fixture or database backed. */
export interface CourseCatalogRepository {
	search(criteria: CourseSearchCriteria): Promise<CourseSearchResult>;
}

/** Fixture backed repository. Takes a snapshot so later mutation of the source array cannot leak in. */
export function createInMemoryCourseCatalogRepository(courses: readonly Course[]): CourseCatalogRepository {
	const snapshot: readonly Course[] = [...courses];
	return {
		search: (criteria) => Promise.resolve(searchCourseCatalog(snapshot, criteria)),
	};
}
