import type { DomainSeedwork } from '../../../seedwork/index.ts';
import type { Passport } from '../../passport.ts';
import type { EnrollmentRequest } from './enrollment-request.aggregate.ts';
import type { EnrollmentRequestProps } from './enrollment-request.entity.ts';
import type { EnrollmentRequestRepository } from './enrollment-request.repository.ts';

export interface EnrollmentRequestUnitOfWork
	extends DomainSeedwork.UnitOfWork<Passport, EnrollmentRequestProps, EnrollmentRequest<EnrollmentRequestProps>, EnrollmentRequestRepository<EnrollmentRequestProps>>,
		DomainSeedwork.InitializedUnitOfWork<Passport, EnrollmentRequestProps, EnrollmentRequest<EnrollmentRequestProps>, EnrollmentRequestRepository<EnrollmentRequestProps>> {}
