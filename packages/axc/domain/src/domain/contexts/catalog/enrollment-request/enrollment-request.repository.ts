import type { Repository } from '@cellix/domain-seedwork/repository';
import type { CreateEnrollment, EnrollmentRequest } from './enrollment-request.ts';
export interface EnrollmentRepository extends Repository<EnrollmentRequest> {
	getById(id: string): Promise<EnrollmentRequest>;
	getNewInstance(input: CreateEnrollment): Promise<EnrollmentRequest>;
	hasActive(courseId: string, learnerEmail: string): Promise<boolean>;
}
