import type { InitializedUnitOfWork } from '@cellix/domain-seedwork/unit-of-work';
import type { Passport } from '../../passport.ts';
import type { EnrollmentRequestRepository } from './enrollment-request.repository.ts';
import type { EnrollmentRequest, EnrollmentRequestProps } from './enrollment-request.ts';
export type EnrollmentRequestUnitOfWork = InitializedUnitOfWork<Passport, EnrollmentRequestProps, EnrollmentRequest, EnrollmentRequestRepository>;
