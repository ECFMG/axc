import type { Domain } from '@axc/domain';
import type { CourseReadRepository } from './catalog/course/index.ts';
import { CatalogContext } from './catalog/index.ts';

export interface ReadonlyDataSource {
	Catalog: {
		Course: {
			CourseReadRepo: CourseReadRepository;
		};
	};
}

export const ReadonlyDataSourceImplementation = (courses: readonly Domain.Contexts.Catalog.Course.Course[]): ReadonlyDataSource => ({
	Catalog: CatalogContext(courses),
});
