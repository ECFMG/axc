import type { InitializedUnitOfWork, UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';
import type { Passport } from '../../passport.ts';
import type { EnrollmentRequest, EnrollmentRequestProps } from './enrollment-request.aggregate.ts';
import type { EnrollmentRequestRepository } from './enrollment-request.repository.ts';

export interface EnrollmentRequestUnitOfWork
	extends UnitOfWork<Passport, EnrollmentRequestProps, EnrollmentRequest<EnrollmentRequestProps>, EnrollmentRequestRepository<EnrollmentRequestProps>>,
		InitializedUnitOfWork<Passport, EnrollmentRequestProps, EnrollmentRequest<EnrollmentRequestProps>, EnrollmentRequestRepository<EnrollmentRequestProps>> {}
