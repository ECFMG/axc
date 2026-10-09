import type { Course } from '@axc/domain';
import type { Store } from '../../../store.ts';
export interface CourseReadRepository {
	getAll(): Promise<Course[]>;
	getById(id: string): Promise<Course | null>;
}
export const getCourseReadRepository = (store: Store): CourseReadRepository => ({
	getAll: () => Promise.resolve(store.courses.map((course) => ({ ...course, tags: [...course.tags] }))),
	getById: (id) => {
		const course = store.courses.find((item) => item.id === id);
		return Promise.resolve(course ? { ...course, tags: [...course.tags] } : null);
	},
});
