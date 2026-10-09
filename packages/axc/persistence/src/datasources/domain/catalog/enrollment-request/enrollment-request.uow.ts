import type { EnrollmentRequest, EnrollmentRequestUnitOfWork } from '@axc/domain';
import { cloneRequest, type Store } from '../../../store.ts';
import { getEnrollmentRequestRepository } from './enrollment-request.repository.ts';
export const getEnrollmentRequestUnitOfWork = (store: Store): EnrollmentRequestUnitOfWork => ({
	withScopedTransaction: async (operation) => {
		const previous = store.queue;
		let release!: () => void;
		store.queue = new Promise<void>((resolve) => {
			release = resolve;
		});
		await previous;
		const working = new Map<string, EnrollmentRequest>([...store.requests].map(([id, item]) => [id, cloneRequest(item)]));
		try {
			const result = await operation(getEnrollmentRequestRepository(working));
			store.requests = working;
			return result;
		} finally {
			release();
		}
	},
});
