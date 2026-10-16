import { courses } from './course.data.ts';
import { InMemoryCourseReadRepository } from './course.read-repository.ts';

export type { Course, CourseSearchQuery, CourseSearchResult } from './course.read-repository.ts';
export const CourseReadRepositoryImpl = () => ({ CourseReadRepo: new InMemoryCourseReadRepository(courses) });
