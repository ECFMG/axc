import type { EnrollmentRequestRepository } from './enrollment-request.repository.ts';

export interface EnrollmentRequestUnitOfWork {
	withScopedTransaction<T>(work: (repository: EnrollmentRequestRepository) => Promise<T>): Promise<T>;
}
