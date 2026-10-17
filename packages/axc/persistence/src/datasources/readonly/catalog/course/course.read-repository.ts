import { Catalog } from '@axc/domain';
import type { Store } from '../../../store.ts';

export interface CourseReadRepository {
	getById(id: string): Promise<Catalog.Course.CourseEntityReference | null>;
	list(): Promise<readonly Catalog.Course.CourseEntityReference[]>;
}
export const getCourseReadRepository = (store: Store): CourseReadRepository => ({
	getById: (id) => {
		const record = store.courses.find((course) => course.id === id);
		return Promise.resolve(record ? new Catalog.Course.Course(structuredClone(record), undefined).toReference() : null);
	},
	list: async () => store.courses.map((record) => new Catalog.Course.Course(structuredClone(record), undefined).toReference()),
});
