import type { Repository } from '@cellix/domain-seedwork/repository';
import type { EnrollmentRequest, EnrollmentRequestNewInput, EnrollmentRequestProps } from './enrollment-request.aggregate.ts';

export interface EnrollmentRequestRepository<props extends EnrollmentRequestProps> extends Repository<EnrollmentRequest<props>> {
	getNewInstance(input: EnrollmentRequestNewInput): Promise<EnrollmentRequest<props>>;
	getById(id: string): Promise<EnrollmentRequest<props>>;
}
