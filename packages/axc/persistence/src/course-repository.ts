import { type Course, type CourseSearchCriteria, compareCourses, matchesCourse } from '@axc/domain';
import { seedCourses } from './course-seed.ts';

export interface CoursePage {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

export interface CourseRepository {
	search(criteria: CourseSearchCriteria): Promise<CoursePage>;
	getById(id: string): Promise<Course | undefined>;
}

/** Fixture-backed repository. The catalog is read-only, so the seed array is the store. */
export class InMemoryCourseRepository implements CourseRepository {
	readonly #courses: readonly Course[];

	constructor(courses: readonly Course[] = seedCourses) {
		this.#courses = courses;
	}

	search(criteria: CourseSearchCriteria): Promise<CoursePage> {
		const matched = this.#courses.filter((course) => matchesCourse(course, criteria)).sort((a, b) => compareCourses(a, b, criteria.sort));
		const start = (criteria.page - 1) * criteria.pageSize;
		return Promise.resolve({
			items: matched.slice(start, start + criteria.pageSize),
			page: criteria.page,
			pageSize: criteria.pageSize,
			totalItems: matched.length,
			totalPages: Math.ceil(matched.length / criteria.pageSize),
		});
	}

	getById(id: string): Promise<Course | undefined> {
		return Promise.resolve(this.#courses.find((course) => course.id === id));
	}
}
