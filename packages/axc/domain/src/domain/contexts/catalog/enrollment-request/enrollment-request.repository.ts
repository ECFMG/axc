import type { EnrollmentRequest } from './enrollment-request.ts';

export interface EnrollmentRequestRepository {
	getById(id: string): Promise<EnrollmentRequest | null>;
	findActive(courseId: string, learnerEmail: string): Promise<EnrollmentRequest | null>;
	save(request: EnrollmentRequest): Promise<EnrollmentRequest>;
}
