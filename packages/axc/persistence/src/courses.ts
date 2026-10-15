import type { Course, CourseReadRepository } from '@axc/domain';

export function createInMemoryCourseRepository(courses: readonly Course[]): CourseReadRepository {
	return {
		getAll: () => Promise.resolve(structuredClone([...courses])),
	};
}
