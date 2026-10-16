import type * as DomainSeedwork from '@cellix/domain-seedwork/repository';
import type { EnrollmentRequest } from './enrollment-request.aggregate.ts';
import type { EnrollmentRequestProps } from './enrollment-request.entity.ts';
import type { CreateEnrollmentRequestInput, EnrollmentRequestCriteria, EnrollmentRequestRecord } from './enrollment-request.value-objects.ts';
export interface EnrollmentRequestRepository extends DomainSeedwork.Repository<EnrollmentRequest<EnrollmentRequestProps>> {
	getNewInstance(input: CreateEnrollmentRequestInput, id: string, now: string): Promise<EnrollmentRequest<EnrollmentRequestProps>>;
	findById(id: string): Promise<EnrollmentRequest<EnrollmentRequestProps> | undefined>;
}
export interface EnrollmentRequestReadRepository {
	getById(id: string): Promise<EnrollmentRequestRecord | undefined>;
	list(criteria: EnrollmentRequestCriteria): Promise<EnrollmentRequestRecord[]>;
}
