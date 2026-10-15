import type { Domain } from '@axc/domain';
import { CourseReadRepositoryImpl } from './course/index.ts';

export * as Course from './course/index.ts';
export const CatalogReadRepositories = (courses: readonly Domain.Contexts.Catalog.Course.Course[]) => ({ Course: CourseReadRepositoryImpl(courses) });
