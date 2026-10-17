import { CourseReadRepo, type CourseReadRepository } from './course/course.read-repository.ts';
export const Catalog = (): { Course: { CourseReadRepo: CourseReadRepository } } => ({ Course: { CourseReadRepo: CourseReadRepo() } });
