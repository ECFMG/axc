import type { Repository } from '@cellix/domain-seedwork/repository';
import type { UnitOfWork } from '@cellix/domain-seedwork/unit-of-work';
import type { EnrollmentRequest, EnrollmentRequestProps } from './enrollment-request.ts';
import type { EnrollmentStatus } from './enrollment-request.value-objects.ts';
export interface EnrollmentRequestRepository extends Repository<EnrollmentRequest> {}
/** One aggregate and its embedded history are committed atomically per operation. */
export type EnrollmentRequestUnitOfWork = UnitOfWork<undefined, EnrollmentRequestProps, EnrollmentRequest, EnrollmentRequestRepository>;
export interface EnrollmentRequestCriteria {
	status?: EnrollmentStatus;
	courseId?: string;
	learnerEmail?: string;
}
export interface EnrollmentRequestReadRepository {
	getById(id: string): Promise<EnrollmentRequestProps | null>;
	list(criteria: EnrollmentRequestCriteria): Promise<EnrollmentRequestProps[]>;
}
