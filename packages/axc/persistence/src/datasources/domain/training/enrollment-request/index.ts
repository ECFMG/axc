import type { Store } from '../../../store.ts';
import { EnrollmentRequestUnitOfWork } from './enrollment-request.uow.ts';
export const EnrollmentRequestPersistence = (store: Store) => ({ EnrollmentRequestUnitOfWork: new EnrollmentRequestUnitOfWork(store) });
