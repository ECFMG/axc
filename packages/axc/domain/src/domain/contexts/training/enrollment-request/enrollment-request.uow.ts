import type * as DomainSeedwork from '@cellix/domain-seedwork/unit-of-work';
import type { Passport } from '../../passport.ts';
import type { EnrollmentRequestAggregate } from './enrollment-request.aggregate.ts';
import type { EnrollmentRequestProps } from './enrollment-request.entity.ts';
import type { EnrollmentRequestRepository } from './enrollment-request.repository.ts';
export interface EnrollmentRequestUnitOfWork<P extends EnrollmentRequestProps>
	extends DomainSeedwork.UnitOfWork<Passport, P, EnrollmentRequestAggregate<P>, EnrollmentRequestRepository<P>>,
		DomainSeedwork.InitializedUnitOfWork<Passport, P, EnrollmentRequestAggregate<P>, EnrollmentRequestRepository<P>> {}
