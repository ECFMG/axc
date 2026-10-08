import type { Domain } from '@axc/domain';
import { CourseReadRepositoryImpl } from './course/index.ts';

export const CatalogContext = (courses: readonly Domain.Contexts.Catalog.Course.Course[]) => ({
	Course: CourseReadRepositoryImpl(courses),
});
