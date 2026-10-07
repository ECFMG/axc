import { getCourseReadRepository } from './course.read-repository.ts';

export type { CoursePage, CourseReadRepository, CourseSearchQuery } from './course.read-repository.ts';
export const CourseReadRepositoryImpl = () => ({ CourseReadRepo: getCourseReadRepository() });
