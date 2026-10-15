import type { Domain } from '@axc/domain';
import { type CourseReadRepository, getCourseReadRepository } from './course/index.ts';

export interface CatalogReadonlyDataSource {
	Course: { CourseReadRepo: CourseReadRepository };
}

export const CatalogContext = (courses: readonly Domain.Contexts.Catalog.Course.Course[]): CatalogReadonlyDataSource => ({
	Course: { CourseReadRepo: getCourseReadRepository(courses) },
});
