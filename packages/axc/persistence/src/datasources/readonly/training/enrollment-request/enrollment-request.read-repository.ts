import type { EnrollmentRequestEntityReference, EnrollmentStatus } from '@axc/domain';
export interface EnrollmentRequestFilter {
	status?: EnrollmentStatus;
	courseId?: string;
	learnerEmail?: string;
}
export interface EnrollmentRequestReadRepository {
	getById(id: string): Promise<EnrollmentRequestEntityReference | null>;
	list(filter: EnrollmentRequestFilter): Promise<EnrollmentRequestEntityReference[]>;
}
