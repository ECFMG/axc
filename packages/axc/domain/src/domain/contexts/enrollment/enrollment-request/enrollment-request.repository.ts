import type { DomainSeedwork } from '../../../seedwork/index.ts';
import type { EnrollmentRequest, EnrollmentRequestNewInput } from './enrollment-request.aggregate.ts';
import type { EnrollmentRequestProps } from './enrollment-request.entity.ts';

export interface EnrollmentRequestRepository<props extends EnrollmentRequestProps> extends DomainSeedwork.Repository<EnrollmentRequest<props>> {
	getNewInstance(input: EnrollmentRequestNewInput): Promise<EnrollmentRequest<props>>;
}
