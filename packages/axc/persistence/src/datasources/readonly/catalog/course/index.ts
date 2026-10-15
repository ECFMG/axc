import type { Domain } from '@axc/domain';
import { type CourseReadRepository, getCourseReadRepository } from './course.read-repository.ts';

export const CourseReadRepositoryImpl = (courses: readonly Domain.Contexts.Catalog.Course.Course[]): { CourseReadRepo: CourseReadRepository } => ({
	CourseReadRepo: getCourseReadRepository(courses),
});
