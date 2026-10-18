import { type CourseReadRepository, createCourseReadRepository } from './course/course.read-repository.ts';
export const Catalog = (): { Course: { CourseReadRepo: CourseReadRepository } } => ({ Course: { CourseReadRepo: createCourseReadRepository() } });
