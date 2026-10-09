import type { CourseVisa } from './course/course.visa.ts';

export interface Passport {
	course: {
		forCourse(entity: unknown): CourseVisa;
	};
}
