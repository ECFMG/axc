import type { Repository } from '@cellix/domain-seedwork/repository';
import type { EnrollmentRequest, NewEnrollmentRequest } from './enrollment-request.aggregate.ts';
import type { EnrollmentStatus } from './enrollment-request.value-objects.ts';

export interface EnrollmentRequestFilter {
	status?: EnrollmentStatus | undefined;
	courseId?: string | undefined;
	learnerEmail?: string | undefined;
}

export interface EnrollmentRequestRepository extends Repository<EnrollmentRequest> {
	getNewInstance(input: NewEnrollmentRequest): EnrollmentRequest;
	getById(id: string): Promise<EnrollmentRequest | undefined>;
	find(filter: EnrollmentRequestFilter): Promise<EnrollmentRequest[]>;
}
