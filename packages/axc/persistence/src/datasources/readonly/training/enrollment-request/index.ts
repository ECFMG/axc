import type { EnrollmentRequestProps } from '@axc/domain';
import { InMemoryEnrollmentRequestReadRepository } from './enrollment-request.data.ts';

export type { EnrollmentRequestFilter } from './enrollment-request.read-repository.ts';
export const EnrollmentRequestReadRepositoryImpl = (records: Map<string, EnrollmentRequestProps>) => ({ EnrollmentRequestReadRepo: new InMemoryEnrollmentRequestReadRepository(records) });
