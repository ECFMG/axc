import { type Course, type CourseCatalogRepository, type CoursePage, type CourseSearchCriteria, searchCourses } from '@axc/domain';
import { COURSE_SEED } from './course-seed.ts';

/** Course catalog held in process memory. Defaults to the seed catalog. */
export class InMemoryCourseCatalogRepository implements CourseCatalogRepository {
	readonly #courses: readonly Course[];

	constructor(courses: readonly Course[] = COURSE_SEED) {
		this.#courses = courses;
	}

	search(criteria: CourseSearchCriteria): Promise<CoursePage> {
		return Promise.resolve(searchCourses(this.#courses, criteria));
	}
}
