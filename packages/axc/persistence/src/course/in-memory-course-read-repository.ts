import type { Course, CourseReadRepository, CourseSearchCriteria, CourseSearchResult } from '@axc/domain';
import { searchCourses } from '@axc/domain';
import { COURSE_SEED_DATA } from './course-seed-data.ts';

/**
 * Fixture-backed implementation of the catalog read port.
 *
 * The catalog is read-only and small, so it is held in memory. This keeps the endpoint
 * runnable and testable with no external service; see the MADR in `apps/docs` for the
 * decision record and the path to a Mongoose-backed repository.
 */
export class InMemoryCourseReadRepository implements CourseReadRepository {
	private readonly courses: readonly Course[];

	public constructor(courses: readonly Course[] = COURSE_SEED_DATA) {
		this.courses = courses;
	}

	public search(criteria: CourseSearchCriteria): Promise<CourseSearchResult> {
		return Promise.resolve(searchCourses(this.courses, criteria));
	}
}
