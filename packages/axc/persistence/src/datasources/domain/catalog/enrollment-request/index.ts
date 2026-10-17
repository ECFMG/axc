import type { Catalog } from '@axc/domain';
import type { Store } from '../../../store.ts';
import { getEnrollmentRequestUnitOfWork } from './enrollment-request.uow.ts';
export const EnrollmentRequestPersistence = (store: Store): { EnrollmentRequestUnitOfWork: Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork } => ({ EnrollmentRequestUnitOfWork: getEnrollmentRequestUnitOfWork(store) });
