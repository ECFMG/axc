import type { Store } from '../../../store.ts';
import { EnrollmentRequestReadRepositoryImpl } from './enrollment-request.read-repository.ts';

export const EnrollmentRequestReadRepositoryFactory = (store: Store) => ({ EnrollmentRequestReadRepo: new EnrollmentRequestReadRepositoryImpl(store) });
