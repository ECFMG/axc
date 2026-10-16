import type { EnrollmentRequestProps } from '@axc/domain';
import { InMemoryEnrollmentRequestUnitOfWork } from './enrollment-request.uow.ts';
export const EnrollmentRequestPersistence = (records: Map<string, EnrollmentRequestProps>) => ({ EnrollmentRequestUnitOfWork: new InMemoryEnrollmentRequestUnitOfWork(records) });
