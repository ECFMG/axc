import type { Store } from '../../../store.ts';
import { type EnrollmentRequestReadRepository, getEnrollmentRequestReadRepository } from './enrollment-request.read-repository.ts';

export const EnrollmentRequestReadRepositoryImpl = (store: Store): { EnrollmentRequestReadRepo: EnrollmentRequestReadRepository } => ({
	EnrollmentRequestReadRepo: getEnrollmentRequestReadRepository(store),
});
