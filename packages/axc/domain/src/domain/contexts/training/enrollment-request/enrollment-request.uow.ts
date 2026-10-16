import type * as DomainSeedwork from '@cellix/domain-seedwork/unit-of-work';
import type { Passport } from '../../../passport.ts';
import type { EnrollmentRequest } from './enrollment-request.aggregate.ts';
import type { EnrollmentRequestProps } from './enrollment-request.entity.ts';
import type { EnrollmentRequestRepository } from './enrollment-request.repository.ts';
export interface EnrollmentRequestUnitOfWork
	extends DomainSeedwork.UnitOfWork<Passport, EnrollmentRequestProps, EnrollmentRequest<EnrollmentRequestProps>, EnrollmentRequestRepository>,
		DomainSeedwork.InitializedUnitOfWork<Passport, EnrollmentRequestProps, EnrollmentRequest<EnrollmentRequestProps>, EnrollmentRequestRepository> {}
