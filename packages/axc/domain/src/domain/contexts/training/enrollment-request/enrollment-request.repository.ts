import type * as DomainSeedwork from '@cellix/domain-seedwork/repository';
import type { EnrollmentRequestAggregate } from './enrollment-request.aggregate.ts';
import type { CreateEnrollmentRequest, EnrollmentRequestProps } from './enrollment-request.entity.ts';
export interface EnrollmentRequestRepository<P extends EnrollmentRequestProps> extends DomainSeedwork.Repository<EnrollmentRequestAggregate<P>> {
	getNewInstance(input: CreateEnrollmentRequest): Promise<EnrollmentRequestAggregate<P>>;
	queryById(id: string): Promise<EnrollmentRequestAggregate<P> | undefined>;
	hasActiveRequest(courseId: string, learnerEmail: string): Promise<boolean>;
}
