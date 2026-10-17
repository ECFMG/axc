import type { Store } from '../../store.ts';
import { CoursePersistence } from './course/index.ts';
import { EnrollmentRequestReadPersistence } from './enrollment-request/index.ts';
export const CatalogReadonly = (store: Store) => ({ Course: CoursePersistence(store), EnrollmentRequest: EnrollmentRequestReadPersistence(store) });
