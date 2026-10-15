import type { Domain } from '@axc/domain';

type Course = Domain.Contexts.Catalog.Course.Course;

/** Read-only catalog access; no aggregate writes or unit of work are needed. */
export interface CourseReadRepository {
	getAll(): Promise<Course[]>;
}

export function buildCourseReadRepository(courses: readonly Course[]): CourseReadRepository {
	const snapshot = structuredClone([...courses]);
	return {
		getAll: () => Promise.resolve(structuredClone(snapshot)),
	};
}
