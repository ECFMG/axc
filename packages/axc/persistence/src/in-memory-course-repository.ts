import type { Course, CourseRepository } from '@axc/domain';
import { COURSE_SEED } from './course-seed.ts';

export class InMemoryCourseRepository implements CourseRepository {
	private readonly courses: readonly Course[];

	constructor(courses: readonly Course[] = COURSE_SEED) {
		this.courses = courses;
	}

	list(): Promise<readonly Course[]> {
		return Promise.resolve(this.courses);
	}

	getById(id: string): Promise<Course | undefined> {
		return Promise.resolve(this.courses.find((c) => c.id === id));
	}
}
