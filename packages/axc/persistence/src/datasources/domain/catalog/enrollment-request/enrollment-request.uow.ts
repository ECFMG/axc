import type { Catalog } from '@axc/domain';
import type { Store } from '../../../store.ts';
import { EnrollmentRequestConverter } from './enrollment-request.domain-adapter.ts';
import { EnrollmentRequestRepository } from './enrollment-request.repository.ts';
export const getEnrollmentRequestUnitOfWork = (store: Store): Catalog.EnrollmentRequest.EnrollmentRequestUnitOfWork => {
	const withTransaction = async (_passport: undefined, operation: (repo: EnrollmentRequestRepository) => Promise<void>) => {
		const previous = store.lock;
		let release!: () => void;
		store.lock = new Promise<void>((resolve) => {
			release = resolve;
		});
		await previous;
		const snapshot = new Map([...store.requests].map(([id, record]) => [id, structuredClone(record)]));
		const nextId = store.nextId;
		try {
			await operation(new EnrollmentRequestRepository(store, new EnrollmentRequestConverter()));
		} catch (error) {
			store.requests = snapshot;
			store.nextId = nextId;
			throw error;
		} finally {
			release();
		}
	};
	return {
		withTransaction,
		withScopedTransaction: (operation) => withTransaction(undefined, operation),
		withScopedTransactionById: async (id, operation) => {
			let found: Catalog.EnrollmentRequest.EnrollmentRequest | undefined;
			await withTransaction(undefined, async (repo) => {
				await operation(repo);
				found = await repo.get(id);
			});
			if (!found) throw new Error('Enrollment request not found.');
			return found;
		},
	};
};
