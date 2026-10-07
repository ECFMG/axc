import { getCourseReadRepository } from './course.read-repository.ts';

export type { CourseReadRepository, CourseSearchQuery, CourseSearchResult } from './course.read-repository.ts';
export const CourseReadRepositoryImpl = () => ({ CourseReadRepo: getCourseReadRepository() });
