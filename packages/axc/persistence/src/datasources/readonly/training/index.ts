import type { Store } from '../../store.ts';
import { CourseReadRepositoryFactory } from './course/index.ts';
import { EnrollmentRequestReadRepositoryFactory } from './enrollment-request/index.ts';
export const TrainingReadContext = (store: Store) => ({ Course: CourseReadRepositoryFactory(store), EnrollmentRequest: EnrollmentRequestReadRepositoryFactory(store) });
