import type { Course, CourseCatalog } from '@axc/domain';
import { courseFixtures } from './course-fixtures.ts';

export class InMemoryCourseCatalog implements CourseCatalog {
	private readonly courses: readonly Course[];
	constructor(courses: readonly Course[] = courseFixtures) {
		this.courses = courses.map((course) => ({ ...course, tags: [...course.tags] }));
	}
	list(): Promise<readonly Course[]> {
		return Promise.resolve(this.courses.map((course) => ({ ...course, tags: [...course.tags] })));
	}
}
