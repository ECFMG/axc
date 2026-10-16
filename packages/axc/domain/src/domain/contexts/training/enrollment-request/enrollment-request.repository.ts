import type { Repository } from '@cellix/domain-seedwork/repository';
import type { EnrollmentRequest } from './enrollment-request.aggregate.ts';
export interface EnrollmentRequestRepository extends Repository<EnrollmentRequest> {
	getById(id: string): Promise<EnrollmentRequest | null>;
	findActive(courseId: string, learnerEmail: string): Promise<EnrollmentRequest | null>;
}
