import type { Repository } from '@cellix/domain-seedwork/repository';
import type { CreateRequest, EnrollmentRequest } from './enrollment-request.ts';
export interface EnrollmentRequestRepository extends Repository<EnrollmentRequest> {
	getNewInstance(input: CreateRequest): Promise<EnrollmentRequest>;
	getById(id: string): Promise<EnrollmentRequest>;
}
