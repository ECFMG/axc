import type { EnrollmentRequestRepository } from './enrollment-request.repository.ts';
export interface EnrollmentRequestUnitOfWork {
	withScopedTransaction<T>(operation: (repository: EnrollmentRequestRepository) => T | Promise<T>): Promise<T>;
}
