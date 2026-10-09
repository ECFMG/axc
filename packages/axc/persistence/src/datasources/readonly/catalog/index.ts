import type { Store } from '../../store.ts';
import { CourseReadRepositoryImpl } from './course/index.ts';
import { EnrollmentRequestReadRepositoryImpl } from './enrollment-request/index.ts';
export const CatalogContext = (store: Store) => ({
	Course: CourseReadRepositoryImpl(store),
	EnrollmentRequest: EnrollmentRequestReadRepositoryImpl(store),
});
