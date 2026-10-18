import type { InitializedUnitOfWork } from '@cellix/domain-seedwork/unit-of-work';
import type { Passport } from '../../passport.ts';
import type { EnrollmentRepository } from './enrollment-request.repository.ts';
import type { EnrollmentProps, EnrollmentRequest } from './enrollment-request.ts';
export type EnrollmentUnitOfWork = InitializedUnitOfWork<Passport, EnrollmentProps, EnrollmentRequest, EnrollmentRepository>;
