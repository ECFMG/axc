import type { Domain } from '@axc/domain';
import { getCourseReadRepository } from './course.read-repository.ts';

export type { CourseReadRepository } from './course.read-repository.ts';

export const CourseReadRepositoryImpl = (courses: readonly Domain.Contexts.Catalog.Course.Course[]) => ({
	CourseReadRepo: getCourseReadRepository(courses),
});
