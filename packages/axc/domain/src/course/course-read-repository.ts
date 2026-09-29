import type { CourseSearchResult } from './course-search.ts';
import type { CourseSearchCriteria } from './course-search-criteria.ts';

/**
 * Read-side port for the course catalog. The domain owns the contract; the persistence
 * layer supplies the implementation.
 */
export interface CourseReadRepository {
	search(criteria: CourseSearchCriteria): Promise<CourseSearchResult>;
}
