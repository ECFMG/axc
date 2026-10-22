import type { Store } from '../../store.ts';
import { EnrollmentRequestPersistence } from './enrollment-request/index.ts';
export const TrainingDomainContext = (store: Store) => ({ EnrollmentRequest: EnrollmentRequestPersistence(store) });
