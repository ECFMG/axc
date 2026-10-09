import type { Store } from '../../../store.ts';
import { type CourseReadRepository, getCourseReadRepository } from './course.read-repository.ts';

export const CourseReadRepositoryImpl = (store: Store): { CourseReadRepo: CourseReadRepository } => ({ CourseReadRepo: getCourseReadRepository(store) });
