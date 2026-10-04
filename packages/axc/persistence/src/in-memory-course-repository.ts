import type { Course, CourseRepository } from '@axc/domain';

/** Course repository backed by an in-memory snapshot of the courses it was constructed with. */
export class InMemoryCourseRepository implements CourseRepository {
	readonly #courses: readonly Course[];

	constructor(courses: readonly Course[]) {
		this.#courses = [...courses];
	}

	getAll(): Promise<readonly Course[]> {
		return Promise.resolve([...this.#courses]);
	}
}
