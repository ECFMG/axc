import type { Store } from '../../../store.ts';
import { CourseReadRepositoryImpl } from './course.read-repository.ts';

export const CourseReadRepositoryFactory = (store: Store) => ({ CourseReadRepo: new CourseReadRepositoryImpl(store) });
