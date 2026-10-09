import type { EnrollmentRequest } from './enrollment-request.ts';
export interface EnrollmentRequestRepository {
	getById(id: string): EnrollmentRequest | null;
	findActive(courseId: string, learnerEmail: string): EnrollmentRequest | null;
	save(request: EnrollmentRequest): void;
}
