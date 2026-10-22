import type { Repository } from '@cellix/domain-seedwork/repository';
import type { EnrollmentRequest, EnrollmentRequestProps } from './enrollment-request.aggregate.ts';
import type { Justification, LearnerEmail } from './enrollment-request.value-objects.ts';
export interface EnrollmentRequestRepository<P extends EnrollmentRequestProps> extends Repository<EnrollmentRequest<P>> {
	getNewInstance(courseId: string, email: LearnerEmail, justification: Justification, at: string): Promise<EnrollmentRequest<P>>;
	getById(id: string): Promise<EnrollmentRequest<P> | null>;
	hasActive(courseId: string, email: string): Promise<boolean>;
}
